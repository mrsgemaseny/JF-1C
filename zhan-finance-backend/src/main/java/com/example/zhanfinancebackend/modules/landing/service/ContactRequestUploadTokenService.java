package com.example.zhanfinancebackend.modules.landing.service;

import com.example.zhanfinancebackend.modules.landing.entity.ContactRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * Issues and verifies the capability token that authorizes anonymous file uploads to a
 * contact request. The public upload endpoint is otherwise unauthenticated and contact
 * request ids are sequential, so possession of the id alone must not be enough.
 *
 * The token is an HMAC over (id, createdAt) with a key derived from the JWT secret; it is
 * returned once, in the create response, and never stored.
 */
@Service
public class ContactRequestUploadTokenService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String KEY_DOMAIN = "zhanfinance:contact-request-upload:v1";

    private final SecretKeySpec key;

    public ContactRequestUploadTokenService(@Value("${app.jwt.secret}") String jwtSecret) {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("app.jwt.secret is required for contact upload tokens");
        }
        try {
            // Domain-separate from the JWT signing key so a token is never a valid JWT MAC and vice versa.
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(KEY_DOMAIN.getBytes(StandardCharsets.UTF_8));
            byte[] derived = digest.digest(jwtSecret.getBytes(StandardCharsets.UTF_8));
            this.key = new SecretKeySpec(derived, HMAC_ALGORITHM);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    public String issue(ContactRequest contactRequest) {
        return HexFormat.of().formatHex(mac(payload(contactRequest)));
    }

    public boolean verify(ContactRequest contactRequest, String providedToken) {
        if (contactRequest == null || providedToken == null || providedToken.isBlank()) {
            return false;
        }
        byte[] provided;
        try {
            provided = HexFormat.of().parseHex(providedToken.trim());
        } catch (IllegalArgumentException e) {
            return false;
        }
        return MessageDigest.isEqual(mac(payload(contactRequest)), provided);
    }

    private String payload(ContactRequest contactRequest) {
        long createdAtMillis = contactRequest.getCreatedAt() != null ? contactRequest.getCreatedAt().toEpochMilli() : 0L;
        return contactRequest.getId() + ":" + createdAtMillis;
    }

    private byte[] mac(String payload) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(key);
            return mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("HMAC failure", e);
        }
    }
}
