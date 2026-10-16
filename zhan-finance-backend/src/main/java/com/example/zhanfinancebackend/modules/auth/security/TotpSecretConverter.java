package com.example.zhanfinancebackend.modules.auth.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;

@Converter
public class TotpSecretConverter implements AttributeConverter<String, String> {

    private static final String ENCRYPTED_PREFIX = "enc:";
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH_BYTES = 12;
    private static final int GCM_TAG_LENGTH_BITS = 128;

    private static volatile SecretKey staticKey;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public TotpSecretConverter() {
    }

    public static synchronized void initKey(String secret) {
        if (secret != null && !secret.isBlank()) {
            try {
                MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
                byte[] keyBytes = sha256.digest(secret.getBytes(StandardCharsets.UTF_8));
                staticKey = new SecretKeySpec(keyBytes, "AES");
            } catch (NoSuchAlgorithmException e) {
                throw new IllegalStateException("SHA-256 algorithm not available", e);
            }
        }
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null || attribute.isBlank()) {
            return null;
        }
        ensureKeyInitialized();

        try {
            byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
            SECURE_RANDOM.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv);
            cipher.init(Cipher.ENCRYPT_MODE, staticKey, parameterSpec);

            byte[] plaintextBytes = attribute.getBytes(StandardCharsets.UTF_8);
            byte[] ciphertext = cipher.doFinal(plaintextBytes);

            ByteBuffer byteBuffer = ByteBuffer.allocate(iv.length + ciphertext.length);
            byteBuffer.put(iv);
            byteBuffer.put(ciphertext);

            return ENCRYPTED_PREFIX + Base64.getEncoder().encodeToString(byteBuffer.array());
        } catch (Exception e) {
            throw new IllegalStateException("Failed to encrypt TOTP secret", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }

        // Backward compatibility: If existing data is plain unencrypted Base32, return as-is
        if (!dbData.startsWith(ENCRYPTED_PREFIX)) {
            return dbData;
        }

        ensureKeyInitialized();

        try {
            return decryptWithKey(dbData, staticKey);
        } catch (Exception primaryEx) {
            // Attempt fallback decryption with test/legacy secret in case key changed
            try {
                MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
                byte[] fallbackKeyBytes = sha256.digest("default-fallback-insecure-test-secret-minimum-32-chars".getBytes(StandardCharsets.UTF_8));
                SecretKey fallbackKey = new SecretKeySpec(fallbackKeyBytes, "AES");
                return decryptWithKey(dbData, fallbackKey);
            } catch (Exception fallbackEx) {
                throw new IllegalStateException("Failed to decrypt TOTP secret", primaryEx);
            }
        }
    }

    private String decryptWithKey(String dbData, SecretKey key) throws Exception {
        String base64Payload = dbData.substring(ENCRYPTED_PREFIX.length());
        byte[] combined = Base64.getDecoder().decode(base64Payload);

        if (combined.length < GCM_IV_LENGTH_BYTES) {
            throw new IllegalStateException("Corrupted encrypted TOTP secret payload");
        }

        ByteBuffer byteBuffer = ByteBuffer.wrap(combined);
        byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
        byteBuffer.get(iv);

        byte[] ciphertext = new byte[byteBuffer.remaining()];
        byteBuffer.get(ciphertext);

        Cipher cipher = Cipher.getInstance(ALGORITHM);
        GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv);
        cipher.init(Cipher.DECRYPT_MODE, key, parameterSpec);

        byte[] decrypted = cipher.doFinal(ciphertext);
        return new String(decrypted, StandardCharsets.UTF_8);
    }

    private void ensureKeyInitialized() {
        if (staticKey == null) {
            initKey("default-fallback-insecure-test-secret-minimum-32-chars");
        }
    }
}

