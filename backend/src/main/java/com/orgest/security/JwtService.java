package com.orgest.security;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.orgest.config.OrgestProperties;
import com.orgest.domain.AppUser;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private final JwtEncoder encoder;
    private final JwtDecoder decoder;
    private final Duration ttl;

    public JwtService(OrgestProperties props) {
        String secret = props.jwtSecret();
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT_SECRET doit contenir au moins 32 caractères");
        }
        SecretKey key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        this.encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        this.decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        this.ttl = Duration.ofHours(Math.max(1, props.jwtTtlHours()));
    }

    public Duration ttl() { return ttl; }

    public String issue(AppUser u) {
        Instant now = Instant.now();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("orgest")
                .subject(String.valueOf(u.id))
                .issuedAt(now)
                .expiresAt(now.plus(ttl))
                .claim("tv", u.tokenVersion)
                .build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    public Optional<Jwt> parse(String token) {
        try {
            return Optional.of(decoder.decode(token));
        } catch (JwtException e) {
            return Optional.empty();
        }
    }
}
