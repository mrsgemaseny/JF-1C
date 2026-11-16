package com.example.zhanfinancebackend.modules.billing.freedompay;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Freedom Pay (Paybox) signature: MD5 over "scriptName;value1;value2;...;secret" where values
 * are ordered by parameter name (ksort) and pg_sig itself is excluded. scriptName is the last
 * path segment of the URL the message is sent to (init_payment.php, or our result URL's segment).
 * MD5 is mandated by the provider protocol; it is used as a keyed MAC here, not for storage.
 */
public final class FreedomPaySigner {

    private FreedomPaySigner() {}

    public static String sign(String scriptName, Map<String, String> params, String secretKey) {
        TreeMap<String, String> sorted = new TreeMap<>(params);
        sorted.remove("pg_sig");
        List<String> parts = new ArrayList<>();
        parts.add(scriptName);
        for (String value : sorted.values()) {
            parts.add(value == null ? "" : value);
        }
        parts.add(secretKey);
        return md5Hex(String.join(";", parts));
    }

    public static boolean verify(String scriptName, Map<String, String> params, String secretKey) {
        String provided = params.get("pg_sig");
        if (provided == null || provided.isBlank()) {
            return false;
        }
        String expected = sign(scriptName, params, secretKey);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                provided.trim().toLowerCase().getBytes(StandardCharsets.UTF_8));
    }

    private static String md5Hex(String input) {
        try {
            byte[] digest = MessageDigest.getInstance("MD5").digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(32);
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("MD5 not available", e);
        }
    }
}
