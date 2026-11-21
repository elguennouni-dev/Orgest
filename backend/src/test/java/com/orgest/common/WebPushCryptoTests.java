package com.orgest.common;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.charset.StandardCharsets;
import java.security.Signature;
import org.junit.jupiter.api.Test;

class WebPushCryptoTests {
    /** Vecteur produit par une implémentation de référence indépendante (Python http-ece, aes128gcm / RFC 8291). */
    @Test
    void matchesReferenceImplementation() {
        var as = new WebPushCrypto.RawKeys(WebPushCrypto.unb64("g5yvowm1vRL2N1TDeEjqNBzcyFF2tSyFKqacjUu6kSA"), WebPushCrypto.unb64("BOL3yexdM61lmJg_sK5rZNi8F4jJRaJ6cXmyCB1o4Tamhka_M4UcBwiTBAVtewlObuwhFbM5hXKmCwfhyXgA4DU"));
        byte[] body = WebPushCrypto.encrypt("{\"title\":\"Nouvelle vente V-00012\",\"body\":\"7 400,00 DH — Ali\",\"url\":\"/app/sales/12\"}".getBytes(StandardCharsets.UTF_8),
                WebPushCrypto.unb64("BLZNs01ILRfHyRkLZxsT1j8wCCTZYvKUw-s1hP9uBWONT9yxhjBdDd_0KKUgH8eJ3jIehBBfO_bMIzrdyqM3yBU"), WebPushCrypto.unb64("H1YVmt9Y6wPv0IjJUT0z6Q"), as, WebPushCrypto.unb64("rXPFuVZ1dJKQur1QNBOW1Q"));
        assertEquals("rXPFuVZ1dJKQur1QNBOW1QAAEABBBOL3yexdM61lmJg_sK5rZNi8F4jJRaJ6cXmyCB1o4Tamhka_M4UcBwiTBAVtewlObuwhFbM5hXKmCwfhyXgA4DWefzgIA7Gf3GBiHDTvH3TMFNtkXxp5YoXtFazlSNSAcBfhy9fRHGBQN8u1fjvx31uZj90R-yTxZq2LFsgXZDJsyJSUHzurIQjcf0b1CNbcoUk109VLtMt1F7GRFb1uJCle-ZS7HU0", WebPushCrypto.b64(body));
    }

    @Test
    void randomizedEncryptionProducesDistinctValidEnvelopes() {
        var ua = WebPushCrypto.generate();
        byte[] auth = new byte[16];
        byte[] a = WebPushCrypto.encrypt("x".getBytes(StandardCharsets.UTF_8), ua.publicKey(), auth);
        byte[] b = WebPushCrypto.encrypt("x".getBytes(StandardCharsets.UTF_8), ua.publicKey(), auth);
        assertNotEquals(WebPushCrypto.b64(a), WebPushCrypto.b64(b));
        assertEquals(16 + 4 + 1 + 65 + 1 + 1 + 16, a.length);   // sel + rs + idlen + clé + donnée + délimiteur + tag
    }

    @Test
    void rejectsInvalidKeysAndOversizedPayload() {
        var ua = WebPushCrypto.generate();
        byte[] auth = new byte[16];
        assertThrows(IllegalArgumentException.class, () -> WebPushCrypto.encrypt(new byte[]{1}, new byte[65], auth));
        assertThrows(IllegalArgumentException.class, () -> WebPushCrypto.encrypt(new byte[4000], ua.publicKey(), auth));
    }

    @Test
    void vapidJwtIsAValidEs256Signature() throws Exception {
        var k = WebPushCrypto.generate();
        String jwt = WebPushCrypto.vapidJwt("https://fcm.googleapis.com", 2000000000L, "mailto:a@b.c", k.privateKey());
        String[] p = jwt.split("\\.");
        assertEquals(3, p.length);
        assertEquals(64, WebPushCrypto.unb64(p[2]).length);
        Signature s = Signature.getInstance("SHA256withECDSAinP1363Format");
        s.initVerify(WebPushCrypto.publicKey(k.publicKey()));
        s.update((p[0] + "." + p[1]).getBytes(StandardCharsets.US_ASCII));
        assertTrue(s.verify(WebPushCrypto.unb64(p[2])));
        assertTrue(new String(WebPushCrypto.unb64(p[1]), StandardCharsets.UTF_8).contains("\"aud\":\"https://fcm.googleapis.com\""));
    }
}
