package com.example.zhanfinancebackend.modules.billing.freedompay;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FreedomPayClientTest {

    private FreedomPayClient client() {
        FreedomPayConfig cfg = new FreedomPayConfig(true, "9970", "secret", "https://api.freedompay.kz",
                "https://zhanfinance.fly.dev/api/v1/payments/callbacks/freedom", "https://app.example", false, 3600);
        return new FreedomPayClient(cfg);
    }

    @Test
    void parsesFlatResponse() {
        String xml = "<?xml version=\"1.0\" encoding=\"utf-8\"?><response><pg_status>ok</pg_status>"
                + "<pg_payment_id>4567788</pg_payment_id><pg_redirect_url>https://customer.freedompay.kz/pay.html?customer=x</pg_redirect_url></response>";

        Map<String, String> r = FreedomPayClient.parseFlatXml(xml.getBytes(StandardCharsets.UTF_8));

        assertEquals("ok", r.get("pg_status"));
        assertEquals("4567788", r.get("pg_payment_id"));
    }

    @Test
    void rejectsDoctypeToBlockXxe() {
        String xml = "<?xml version=\"1.0\"?><!DOCTYPE r [<!ENTITY x SYSTEM \"file:///etc/passwd\">]><response><pg_status>&x;</pg_status></response>";
        assertThrows(FreedomPayClient.GatewayException.class,
                () -> FreedomPayClient.parseFlatXml(xml.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void emptyResponseIsAnError() {
        assertThrows(FreedomPayClient.GatewayException.class, () -> FreedomPayClient.parseFlatXml(new byte[0]));
    }

    @Test
    void onlyFreedomPayHttpsHostsAreTrustedRedirects() {
        FreedomPayClient c = client();
        assertTrue(c.isTrustedRedirect("https://customer.freedompay.kz/pay.html?customer=x"));
        assertFalse(c.isTrustedRedirect("http://customer.freedompay.kz/pay.html"));
        assertFalse(c.isTrustedRedirect("https://freedompay.kz.evil.example/pay"));
        assertFalse(c.isTrustedRedirect("https://evilfreedompay.kz/pay"));
        assertFalse(c.isTrustedRedirect("javascript:alert(1)"));
    }

    @Test
    void statusSuccessRequiresOkRequestAndSuccessPayment() {
        var ok = new FreedomPayClient.StatusResult(true, "1", "o", "success", java.math.BigDecimal.TEN, "KZT");
        var failed = new FreedomPayClient.StatusResult(true, "1", "o", "error", java.math.BigDecimal.TEN, "KZT");
        var badRequest = new FreedomPayClient.StatusResult(false, "1", "o", "success", java.math.BigDecimal.TEN, "KZT");
        assertTrue(ok.isSuccessful());
        assertFalse(failed.isSuccessful());
        assertFalse(badRequest.isSuccessful());
    }
}
