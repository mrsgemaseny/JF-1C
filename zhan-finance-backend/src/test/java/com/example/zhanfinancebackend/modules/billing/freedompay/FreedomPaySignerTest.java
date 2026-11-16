package com.example.zhanfinancebackend.modules.billing.freedompay;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FreedomPaySignerTest {

    private static String md5(String s) throws Exception {
        byte[] d = MessageDigest.getInstance("MD5").digest(s.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : d) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    @Test
    void signatureFollowsDocumentedScriptSortedValuesSecretOrder() throws Exception {
        // Layout taken from the provider docs: 'init_payment.php;25;test;<merchant>;23;molbulak;<secret>'
        Map<String, String> p = new HashMap<>();
        p.put("pg_order_id", "23");
        p.put("pg_merchant_id", "9970");
        p.put("pg_amount", "25");
        p.put("pg_description", "test");
        p.put("pg_salt", "molbulak");

        String expected = md5("init_payment.php;25;test;9970;23;molbulak;s3cret");

        assertEquals(expected, FreedomPaySigner.sign("init_payment.php", p, "s3cret"));
    }

    @Test
    void signatureIgnoresExistingPgSigField() {
        Map<String, String> p = new HashMap<>();
        p.put("pg_order_id", "1");
        String without = FreedomPaySigner.sign("freedom", p, "k");
        p.put("pg_sig", "anything");
        assertEquals(without, FreedomPaySigner.sign("freedom", p, "k"));
    }

    @Test
    void verifyAcceptsValidAndRejectsTamperedOrMissingSignature() {
        Map<String, String> p = new HashMap<>();
        p.put("pg_order_id", "ZF7-abc");
        p.put("pg_amount", "30000");
        p.put("pg_result", "1");
        p.put("pg_sig", FreedomPaySigner.sign("freedom", p, "k"));

        assertTrue(FreedomPaySigner.verify("freedom", p, "k"));

        p.put("pg_amount", "1");
        assertFalse(FreedomPaySigner.verify("freedom", p, "k"));

        p.remove("pg_sig");
        assertFalse(FreedomPaySigner.verify("freedom", p, "k"));
    }

    @Test
    void verifyIsBoundToScriptNameAndSecret() {
        Map<String, String> p = new HashMap<>();
        p.put("pg_order_id", "1");
        p.put("pg_sig", FreedomPaySigner.sign("freedom", p, "k"));

        assertFalse(FreedomPaySigner.verify("other", p, "k"));
        assertFalse(FreedomPaySigner.verify("freedom", p, "different"));
    }

    @Test
    void merchantParametersWithoutPgPrefixAreSigned() {
        Map<String, String> p = new HashMap<>();
        p.put("pg_order_id", "1");
        p.put("custom", "x");
        String a = FreedomPaySigner.sign("freedom", p, "k");
        p.put("custom", "y");
        assertFalse(a.equals(FreedomPaySigner.sign("freedom", p, "k")));
    }
}
