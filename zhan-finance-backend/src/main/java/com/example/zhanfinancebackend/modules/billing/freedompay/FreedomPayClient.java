package com.example.zhanfinancebackend.modules.billing.freedompay;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/** Server-to-server calls to the Freedom Pay gateway (init_payment.php, get_status3.php). */
@Component
public class FreedomPayClient {
    private static final Logger log = LoggerFactory.getLogger(FreedomPayClient.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    public record InitResult(String paymentId, String redirectUrl) {}

    public record StatusResult(boolean requestOk, String paymentId, String orderId, String paymentStatus,
                               BigDecimal amount, String currency) {
        /** Freedom reports a settled payment as "success"; "ok" is accepted defensively. */
        public boolean isSuccessful() {
            return requestOk && paymentStatus != null
                    && ("success".equalsIgnoreCase(paymentStatus) || "ok".equalsIgnoreCase(paymentStatus));
        }
    }

    public static class GatewayException extends RuntimeException {
        public GatewayException(String message, Throwable cause) { super(message, cause); }
        public GatewayException(String message) { super(message); }
    }

    private final FreedomPayConfig config;
    private final RestClient http;

    public FreedomPayClient(FreedomPayConfig config) {
        this.config = config;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.http = RestClient.builder().requestFactory(factory).build();
    }

    public InitResult initPayment(String orderId, java.math.BigDecimal amount, String description,
                                  String returnUrl) {
        Map<String, String> p = new HashMap<>();
        p.put("pg_merchant_id", config.getMerchantId());
        p.put("pg_order_id", orderId);
        p.put("pg_amount", amount.stripTrailingZeros().toPlainString());
        p.put("pg_currency", "KZT");
        p.put("pg_description", description);
        p.put("pg_salt", salt());
        p.put("pg_result_url", config.getResultUrl());
        p.put("pg_request_method", "POST");
        p.put("pg_success_url", returnUrl);
        p.put("pg_failure_url", returnUrl);
        p.put("pg_lifetime", String.valueOf(config.getLifetimeSeconds()));
        if (config.isTestingMode()) {
            p.put("pg_testing_mode", "1");
        }
        Map<String, String> response = post("init_payment.php", p);
        if (!"ok".equals(response.get("pg_status"))) {
            log.warn("Freedom init_payment refused order {}: {} {}", orderId,
                    response.get("pg_error_code"), response.get("pg_error_description"));
            throw new GatewayException("Freedom Pay refused to create the payment");
        }
        String redirect = response.get("pg_redirect_url");
        String paymentId = response.get("pg_payment_id");
        if (redirect == null || paymentId == null || !isTrustedRedirect(redirect)) {
            throw new GatewayException("Freedom Pay returned an unusable redirect");
        }
        return new InitResult(paymentId, redirect);
    }

    public StatusResult getStatus(String orderId) {
        Map<String, String> p = new HashMap<>();
        p.put("pg_merchant_id", config.getMerchantId());
        p.put("pg_order_id", orderId);
        p.put("pg_salt", salt());
        Map<String, String> r = post("get_status3.php", p);
        BigDecimal amount = null;
        try {
            if (r.get("pg_amount") != null) amount = new BigDecimal(r.get("pg_amount").trim());
        } catch (NumberFormatException ignored) {
            // leaves amount null; the caller treats a payment without a readable amount as unconfirmed
        }
        return new StatusResult("ok".equals(r.get("pg_status")), r.get("pg_payment_id"), r.get("pg_order_id"),
                r.get("pg_payment_status"), amount, r.get("pg_currency"));
    }

    /** The redirect must point at a Freedom Pay host, never at an arbitrary URL from a response. */
    boolean isTrustedRedirect(String url) {
        try {
            java.net.URI u = java.net.URI.create(url);
            String host = u.getHost();
            return "https".equalsIgnoreCase(u.getScheme()) && host != null
                    && (host.equals("freedompay.kz") || host.endsWith(".freedompay.kz")
                    || host.equals("freedompay.kg") || host.endsWith(".freedompay.kg")
                    || host.equals("freedompay.money") || host.endsWith(".freedompay.money"));
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private Map<String, String> post(String script, Map<String, String> params) {
        Map<String, String> signed = new HashMap<>(params);
        signed.put("pg_sig", FreedomPaySigner.sign(script, params, config.getSecretKey()));
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        signed.forEach(form::add);
        try {
            byte[] body = http.post()
                    .uri(config.getApiBase() + "/" + script)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(byte[].class);
            return parseFlatXml(body);
        } catch (GatewayException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new GatewayException("Freedom Pay request failed: " + script, e);
        }
    }

    /** Parses the flat <response> element into name->text. DTDs and external entities are disabled. */
    static Map<String, String> parseFlatXml(byte[] xml) {
        if (xml == null || xml.length == 0) {
            throw new GatewayException("Empty response from Freedom Pay");
        }
        try {
            DocumentBuilderFactory f = DocumentBuilderFactory.newInstance();
            f.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            f.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            f.setXIncludeAware(false);
            f.setExpandEntityReferences(false);
            Document doc = f.newDocumentBuilder().parse(new ByteArrayInputStream(xml));
            Element root = doc.getDocumentElement();
            Map<String, String> out = new HashMap<>();
            NodeList children = root.getChildNodes();
            for (int i = 0; i < children.getLength(); i++) {
                Node n = children.item(i);
                if (n.getNodeType() == Node.ELEMENT_NODE) {
                    out.put(n.getNodeName(), n.getTextContent() == null ? "" : n.getTextContent().trim());
                }
            }
            return out;
        } catch (Exception e) {
            throw new GatewayException("Unparseable response from Freedom Pay", e);
        }
    }

    private static String salt() {
        byte[] b = new byte[12];
        RANDOM.nextBytes(b);
        return java.util.HexFormat.of().formatHex(b);
    }
}
