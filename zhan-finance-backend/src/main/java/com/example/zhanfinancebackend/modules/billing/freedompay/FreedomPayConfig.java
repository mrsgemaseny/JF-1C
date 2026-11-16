package com.example.zhanfinancebackend.modules.billing.freedompay;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;

/**
 * Freedom Pay settings. Everything comes from environment variables; the secret key is never
 * logged. When enabled, a missing credential stops the application at startup instead of
 * failing on the first payment.
 */
@Component
public class FreedomPayConfig {

    private final boolean enabled;
    private final String merchantId;
    private final String secretKey;
    private final String apiBase;
    private final String resultUrl;
    private final String frontendUrl;
    private final boolean testingMode;
    private final int lifetimeSeconds;

    public FreedomPayConfig(
            @Value("${app.payments.freedom.enabled:false}") boolean enabled,
            @Value("${app.payments.freedom.merchant-id:}") String merchantId,
            @Value("${app.payments.freedom.secret-key:}") String secretKey,
            @Value("${app.payments.freedom.api-base:https://api.freedompay.kz}") String apiBase,
            @Value("${app.payments.freedom.result-url:}") String resultUrl,
            @Value("${app.frontend.url:}") String frontendUrl,
            @Value("${app.payments.freedom.testing-mode:false}") boolean testingMode,
            @Value("${app.payments.freedom.lifetime-seconds:3600}") int lifetimeSeconds) {
        this.enabled = enabled;
        this.merchantId = merchantId == null ? "" : merchantId.trim();
        this.secretKey = secretKey == null ? "" : secretKey.trim();
        this.apiBase = stripTrailingSlash(apiBase);
        this.resultUrl = resultUrl == null ? "" : resultUrl.trim();
        this.frontendUrl = stripTrailingSlash(frontendUrl == null ? "" : frontendUrl);
        this.testingMode = testingMode;
        this.lifetimeSeconds = Math.max(300, Math.min(lifetimeSeconds, 86_400));
        if (enabled) {
            if (this.merchantId.isEmpty() || this.secretKey.isEmpty() || this.resultUrl.isEmpty()) {
                throw new IllegalStateException(
                        "app.payments.freedom.enabled=true requires merchant-id, secret-key and result-url");
            }
            if (!this.apiBase.startsWith("https://") || !this.resultUrl.startsWith("https://")) {
                throw new IllegalStateException("Freedom Pay api-base and result-url must use https");
            }
            if (resultScriptName().isEmpty()) {
                throw new IllegalStateException("app.payments.freedom.result-url must end with a path segment");
            }
        }
    }

    public boolean isEnabled() { return enabled; }
    public String getMerchantId() { return merchantId; }
    public String getSecretKey() { return secretKey; }
    public String getApiBase() { return apiBase; }
    public String getResultUrl() { return resultUrl; }
    public boolean isTestingMode() { return testingMode; }
    public int getLifetimeSeconds() { return lifetimeSeconds; }

    /** Where the buyer lands after paying; the order id lets the page poll the intent status. */
    public String returnUrl(String merchantOrderId) {
        return frontendUrl + "/client/billing?pay=" + merchantOrderId;
    }

    /** Signature "script name" for messages Freedom Pay sends to our result URL. */
    public String resultScriptName() {
        String path = URI.create(resultUrl.isEmpty() ? "https://x/" : resultUrl).getPath();
        if (path == null) return "";
        int slash = path.lastIndexOf('/');
        return slash < 0 ? path : path.substring(slash + 1);
    }

    private static String stripTrailingSlash(String s) {
        String v = s == null ? "" : s.trim();
        return v.endsWith("/") ? v.substring(0, v.length() - 1) : v;
    }
}
