package com.orgest.common;

import java.math.BigInteger;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.AlgorithmParameters;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.SecureRandom;
import java.security.Signature;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPoint;
import java.security.spec.ECPrivateKeySpec;
import java.security.spec.ECPublicKeySpec;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * Web Push sans dépendance : chiffrement de contenu « aes128gcm » (RFC 8188 / RFC 8291) et jeton VAPID ES256 (RFC 8292).
 * Vérifié contre une implémentation de référence (http-ece, Python) dans WebPushCryptoTests.
 */
public final class WebPushCrypto {
    private WebPushCrypto() {}

    private static final SecureRandom RNG = new SecureRandom();
    private static final ECParameterSpec P256 = params();
    private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();

    public record RawKeys(byte[] privateKey, byte[] publicKey) {}

    private static ECParameterSpec params() {
        try {
            AlgorithmParameters ap = AlgorithmParameters.getInstance("EC");
            ap.init(new ECGenParameterSpec("secp256r1"));
            return ap.getParameterSpec(ECParameterSpec.class);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    public static String b64(byte[] b) { return B64.encodeToString(b); }

    public static byte[] unb64(String s) { return Base64.getUrlDecoder().decode(s); }

    /** Nouvelle paire P-256 : clé privée brute (32 octets) et clé publique non compressée (65 octets, 0x04 || X || Y). */
    public static RawKeys generate() {
        try {
            KeyPairGenerator g = KeyPairGenerator.getInstance("EC");
            g.initialize(new ECGenParameterSpec("secp256r1"), RNG);
            KeyPair kp = g.generateKeyPair();
            return new RawKeys(fixed(((ECPrivateKey) kp.getPrivate()).getS(), 32), uncompressed((ECPublicKey) kp.getPublic()));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    static byte[] fixed(BigInteger v, int len) {
        byte[] b = v.toByteArray();
        byte[] out = new byte[len];
        int copy = Math.min(b.length, len);
        System.arraycopy(b, b.length - copy, out, len - copy, copy);
        return out;
    }

    static byte[] uncompressed(ECPublicKey k) {
        byte[] out = new byte[65];
        out[0] = 4;
        System.arraycopy(fixed(k.getW().getAffineX(), 32), 0, out, 1, 32);
        System.arraycopy(fixed(k.getW().getAffineY(), 32), 0, out, 33, 32);
        return out;
    }

    static PublicKey publicKey(byte[] raw) throws GeneralSecurityException {
        if (raw.length != 65 || raw[0] != 4) throw new IllegalArgumentException("BAD_PUBLIC_KEY");
        ECPoint w = new ECPoint(new BigInteger(1, java.util.Arrays.copyOfRange(raw, 1, 33)), new BigInteger(1, java.util.Arrays.copyOfRange(raw, 33, 65)));
        return KeyFactory.getInstance("EC").generatePublic(new ECPublicKeySpec(w, P256));   // vérifie que le point est sur la courbe
    }

    static PrivateKey privateKey(byte[] raw) throws GeneralSecurityException {
        return KeyFactory.getInstance("EC").generatePrivate(new ECPrivateKeySpec(new BigInteger(1, raw), P256));
    }

    private static byte[] hmac(byte[] key, byte[] data) throws GeneralSecurityException {
        Mac m = Mac.getInstance("HmacSHA256");
        m.init(new SecretKeySpec(key, "HmacSHA256"));
        return m.doFinal(data);
    }

    /** HKDF (RFC 5869) limité à 32 octets de sortie : un seul bloc suffit pour toutes les dérivations de Web Push. */
    private static byte[] hkdf(byte[] salt, byte[] ikm, byte[] info, int len) throws GeneralSecurityException {
        byte[] prk = hmac(salt, ikm);
        byte[] in = new byte[info.length + 1];
        System.arraycopy(info, 0, in, 0, info.length);
        in[info.length] = 1;
        return java.util.Arrays.copyOf(hmac(prk, in), len);
    }

    private static byte[] cat(byte[]... parts) {
        int n = 0;
        for (byte[] p : parts) n += p.length;
        byte[] out = new byte[n];
        int o = 0;
        for (byte[] p : parts) { System.arraycopy(p, 0, out, o, p.length); o += p.length; }
        return out;
    }

    /** Chiffre {@code payload} pour un abonnement ; clé éphémère et sel fournis (déterministe, pour les tests). */
    public static byte[] encrypt(byte[] payload, byte[] uaPublic, byte[] authSecret, RawKeys as, byte[] salt) {
        try {
            if (payload.length > 3993) throw new IllegalArgumentException("PAYLOAD_TOO_LARGE");   // 4096 − en-tête(86) − tag(16) − délimiteur(1)
            KeyAgreement ka = KeyAgreement.getInstance("ECDH");
            ka.init(privateKey(as.privateKey()));
            ka.doPhase(publicKey(uaPublic), true);
            byte[] ecdh = ka.generateSecret();
            byte[] ikm = hkdf(authSecret, ecdh, cat("WebPush: info\0".getBytes(StandardCharsets.US_ASCII), uaPublic, as.publicKey()), 32);
            byte[] cek = hkdf(salt, ikm, "Content-Encoding: aes128gcm\0".getBytes(StandardCharsets.US_ASCII), 16);
            byte[] nonce = hkdf(salt, ikm, "Content-Encoding: nonce\0".getBytes(StandardCharsets.US_ASCII), 12);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(cek, "AES"), new GCMParameterSpec(128, nonce));
            byte[] ct = c.doFinal(cat(payload, new byte[]{2}));   // 0x02 = dernier (et seul) enregistrement
            ByteBuffer head = ByteBuffer.allocate(21 + as.publicKey().length);
            head.put(salt).putInt(4096).put((byte) as.publicKey().length).put(as.publicKey());
            return cat(head.array(), ct);
        } catch (GeneralSecurityException e) {
            throw new IllegalArgumentException("ENCRYPTION_FAILED", e);
        }
    }

    public static byte[] encrypt(byte[] payload, byte[] uaPublic, byte[] authSecret) {
        byte[] salt = new byte[16];
        RNG.nextBytes(salt);
        return encrypt(payload, uaPublic, authSecret, generate(), salt);
    }

    /** Jeton VAPID (JWT ES256) : aud = origine du service de push, exp en secondes epoch. */
    public static String vapidJwt(String audience, long expEpochSeconds, String subject, byte[] vapidPrivateRaw) {
        try {
            String head = b64("{\"typ\":\"JWT\",\"alg\":\"ES256\"}".getBytes(StandardCharsets.UTF_8));
            String claims = b64(("{\"aud\":\"" + audience + "\",\"exp\":" + expEpochSeconds + ",\"sub\":\"" + subject + "\"}").getBytes(StandardCharsets.UTF_8));
            Signature s = Signature.getInstance("SHA256withECDSAinP1363Format");   // R || S, format JOSE
            s.initSign(privateKey(vapidPrivateRaw));
            s.update((head + "." + claims).getBytes(StandardCharsets.US_ASCII));
            return head + "." + claims + "." + b64(s.sign());
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }
}
