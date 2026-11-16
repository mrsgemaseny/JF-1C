package com.example.zhanfinancebackend.modules.billing.controller;

import com.example.zhanfinancebackend.modules.billing.freedompay.FreedomPayClient;
import com.example.zhanfinancebackend.modules.billing.service.FreedomPaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Freedom Pay result_url. Public by necessity: authenticity comes from the MD5 signature checked
 * in the service plus a server-side get_status3 confirmation, not from the caller's address.
 */
@RestController
@RequestMapping("/v1/payments/callbacks")
public class FreedomPayCallbackController {
    private static final Logger log = LoggerFactory.getLogger(FreedomPayCallbackController.class);

    private final FreedomPaymentService service;

    public FreedomPayCallbackController(FreedomPaymentService service) {
        this.service = service;
    }

    @PostMapping(value = "/freedom", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> result(@RequestParam Map<String, String> params) {
        if (!service.isEnabled()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        try {
            return ResponseEntity.ok(service.handleResult(params));
        } catch (FreedomPayClient.GatewayException e) {
            // Non-200 makes Freedom Pay retry (every 30 min for 2 hours) while we cannot verify.
            log.warn("Freedom result callback deferred: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }
    }
}
