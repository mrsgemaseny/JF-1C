package com.example.zhanfinancebackend.modules.billing.controller;

import com.example.zhanfinancebackend.modules.billing.service.KaspiProviderService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Server-to-server endpoint called by Kaspi. Not authenticated by JWT: access is limited to
 * Kaspi's published IP ranges (app.payments.kaspi.allowed-ips) and is off unless explicitly enabled.
 */
@RestController
@RequestMapping("/v1/payments/callbacks")
public class KaspiProviderController {

    private final KaspiProviderService service;

    public KaspiProviderController(KaspiProviderService service) {
        this.service = service;
    }

    @GetMapping(value = "/kaspi", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> kaspi(@RequestParam(value = "command", required = false) String command,
                                        @RequestParam(value = "txn_id", required = false) String txnId,
                                        @RequestParam(value = "account", required = false) String account,
                                        @RequestParam(value = "sum", required = false) String sum,
                                        @RequestParam(value = "txn_date", required = false) String txnDate,
                                        HttpServletRequest request) {
        String clientIp = resolveClientIp(request);
        if (!service.isCallerAllowed(clientIp)) {
            // Indistinguishable from a route that does not exist.
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        try {
            return ResponseEntity.ok(service.handle(command, txnId, account, sum, txnDate, clientIp));
        } catch (KaspiProviderService.TemporaryFailure e) {
            return ResponseEntity.ok(KaspiProviderService.temporaryErrorXml(e.getTxnId()));
        }
    }

    /** Fly-Client-IP is set by Fly's edge and overwritten if the caller sends it; X-Forwarded-For is not trusted. */
    private static String resolveClientIp(HttpServletRequest request) {
        String ip = request.getHeader("Fly-Client-IP");
        if (ip != null && !ip.isBlank()) {
            return ip.trim();
        }
        return request.getRemoteAddr();
    }
}
