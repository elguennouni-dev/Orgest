package com.orgest.service;

import com.orgest.common.AppException;
import com.orgest.common.Json;
import com.orgest.common.Money;
import com.orgest.common.WebPushCrypto;
import com.orgest.domain.PushSubscription;
import com.orgest.repo.PushSubscriptionRepository;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Notifications Web Push au commerçant à chaque vente (clés VAPID générées une fois et conservées en base). */
@Service
public class PushService {
    private static final Logger log = LoggerFactory.getLogger(PushService.class);
    /** Seuls les services de push des navigateurs sont joignables (évite qu'un abonnement serve de relais vers le réseau interne). */
    private static final List<String> HOST_SUFFIXES = List.of(".googleapis.com", ".mozilla.com", ".push.apple.com", ".windows.com");

    private final PushSubscriptionRepository subs;
    private final JdbcTemplate jdbc;
    private final String subject;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
    private final ExecutorService pool = Executors.newFixedThreadPool(2, r -> { Thread t = new Thread(r, "web-push"); t.setDaemon(true); return t; });
    private volatile WebPushCrypto.RawKeys keys;

    public PushService(PushSubscriptionRepository subs, JdbcTemplate jdbc,
                       @Value("${orgest.vapid.subject:mailto:contact@orgest.tech}") String subject) {
        this.subs = subs;
        this.jdbc = jdbc;
        this.subject = subject;
    }

    private synchronized WebPushCrypto.RawKeys keys() {
        if (keys == null) {
            List<String> pub = jdbc.queryForList("SELECT value FROM app_setting WHERE key = 'vapid.public'", String.class);
            List<String> prv = jdbc.queryForList("SELECT value FROM app_setting WHERE key = 'vapid.private'", String.class);
            if (pub.isEmpty() || prv.isEmpty()) {
                WebPushCrypto.RawKeys k = WebPushCrypto.generate();
                jdbc.update("INSERT INTO app_setting (key, value) VALUES ('vapid.public', ?) ON CONFLICT (key) DO NOTHING", WebPushCrypto.b64(k.publicKey()));
                jdbc.update("INSERT INTO app_setting (key, value) VALUES ('vapid.private', ?) ON CONFLICT (key) DO NOTHING", WebPushCrypto.b64(k.privateKey()));
                pub = jdbc.queryForList("SELECT value FROM app_setting WHERE key = 'vapid.public'", String.class);
                prv = jdbc.queryForList("SELECT value FROM app_setting WHERE key = 'vapid.private'", String.class);
            }
            keys = new WebPushCrypto.RawKeys(WebPushCrypto.unb64(prv.get(0)), WebPushCrypto.unb64(pub.get(0)));
        }
        return keys;
    }

    public String publicKey() { return WebPushCrypto.b64(keys().publicKey()); }

    static boolean allowedEndpoint(String endpoint) {
        try {
            URI u = URI.create(endpoint);
            if (!"https".equals(u.getScheme()) || u.getHost() == null || u.getUserInfo() != null || u.getPort() > 0 && u.getPort() != 443) return false;
            String h = u.getHost().toLowerCase(Locale.ROOT);
            return HOST_SUFFIXES.stream().anyMatch(s -> h.endsWith(s) || h.equals(s.substring(1)));
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    @Transactional
    public void subscribe(Long shopId, String endpoint, String p256dh, String auth) {
        if (!allowedEndpoint(endpoint)) throw AppException.bad("INVALID_PUSH_ENDPOINT");
        try {
            WebPushCrypto.unb64(auth);
            if (WebPushCrypto.unb64(p256dh).length != 65) throw new IllegalArgumentException();
        } catch (IllegalArgumentException e) {
            throw AppException.bad("INVALID_PUSH_KEYS");
        }
        PushSubscription s = subs.findByEndpoint(endpoint).orElseGet(PushSubscription::new);
        if (s.shopId != null && !s.shopId.equals(shopId)) throw AppException.conflict("PUSH_ENDPOINT_TAKEN");
        s.shopId = shopId;
        s.endpoint = endpoint;
        s.p256dh = p256dh;
        s.auth = auth;
        subs.save(s);
    }

    @Transactional
    public void unsubscribe(Long shopId, String endpoint) { subs.deleteByEndpointAndShopId(endpoint, shopId); }

    @Transactional(readOnly = true)
    public long count(Long shopId) { return subs.countByShopId(shopId); }

    /** Notifie après le commit de la vente (jamais pour une vente annulée par un rollback), sans bloquer la requête. */
    public void notifySale(Long shopId, Long saleId, String number, BigDecimal amount, String customer) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("title", "Nouvelle vente " + number);
        m.put("body", Money.round2(amount).toPlainString().replace('.', ',') + " DH" + (customer == null ? "" : " — " + customer));
        m.put("url", "/app/sales/" + saleId);
        String payload = Json.write(m);
        Runnable go = () -> sendToShop(shopId, payload);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { go.run(); }
            });
        } else {
            go.run();
        }
    }

    public void sendTest(Long shopId) {
        sendToShop(shopId, Json.write(Map.of("title", "Orgest", "body", "Les notifications fonctionnent ✓", "url", "/app")));
    }

    private void sendToShop(Long shopId, String payload) {
        List<PushSubscription> list;
        try {
            list = subs.findByShopId(shopId);
        } catch (RuntimeException e) {
            log.warn("push: lecture des abonnements impossible", e);
            return;
        }
        for (PushSubscription s : list) pool.execute(() -> send(s, payload));
    }

    private void send(PushSubscription s, String payload) {
        try {
            WebPushCrypto.RawKeys k = keys();
            byte[] body = WebPushCrypto.encrypt(payload.getBytes(StandardCharsets.UTF_8), WebPushCrypto.unb64(s.p256dh), WebPushCrypto.unb64(s.auth));
            URI u = URI.create(s.endpoint);
            String aud = u.getScheme() + "://" + u.getHost();
            String jwt = WebPushCrypto.vapidJwt(aud, Instant.now().plusSeconds(12 * 3600).getEpochSecond(), subject, k.privateKey());
            HttpRequest req = HttpRequest.newBuilder(u).timeout(Duration.ofSeconds(10))
                    .header("Authorization", "vapid t=" + jwt + ", k=" + WebPushCrypto.b64(k.publicKey()))
                    .header("Content-Encoding", "aes128gcm").header("Content-Type", "application/octet-stream")
                    .header("TTL", "3600").header("Urgency", "normal")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(body)).build();
            int code = http.send(req, HttpResponse.BodyHandlers.discarding()).statusCode();
            if (code == 404 || code == 410) subs.deleteById(s.id);          // abonnement expiré côté navigateur
            else if (code >= 400) log.warn("push: refus {} pour l'abonnement {}", code, s.id);
        } catch (Exception e) {
            log.warn("push: échec d'envoi pour l'abonnement {} ({})", s.id, e.getClass().getSimpleName());
        }
    }
}
