package com.example.zhanfinancebackend.modules.landing.service;

import com.example.zhanfinancebackend.modules.landing.entity.ContactRequest;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class ContactRequestUploadTokenServiceTest {

    private final ContactRequestUploadTokenService service =
            new ContactRequestUploadTokenService("test-secret-key-minimum-32-characters-needed-here-test");

    private ContactRequest request(long id, Instant createdAt) {
        ContactRequest cr = new ContactRequest("Name", "+77000000000", null, null, "test");
        ReflectionTestUtils.setField(cr, "id", id);
        ReflectionTestUtils.setField(cr, "createdAt", createdAt);
        return cr;
    }

    @Test
    void issuedTokenVerifiesForSameRequest() {
        ContactRequest cr = request(42L, Instant.parse("2026-11-16T05:00:00Z"));
        String token = service.issue(cr);
        assertTrue(service.verify(cr, token));
    }

    @Test
    void tokenIsBoundToRequestId() {
        Instant t = Instant.parse("2026-11-16T05:00:00Z");
        String token = service.issue(request(42L, t));
        assertFalse(service.verify(request(43L, t), token));
    }

    @Test
    void tokenIsBoundToCreatedAt() {
        String token = service.issue(request(42L, Instant.parse("2026-11-16T05:00:00Z")));
        assertFalse(service.verify(request(42L, Instant.parse("2026-11-16T05:00:01Z")), token));
    }

    @Test
    void garbageTokensAreRejected() {
        ContactRequest cr = request(1L, Instant.EPOCH);
        assertFalse(service.verify(cr, null));
        assertFalse(service.verify(cr, ""));
        assertFalse(service.verify(cr, "not-hex"));
        assertFalse(service.verify(cr, "00"));
    }

    @Test
    void differentSecretsProduceDifferentTokens() {
        ContactRequestUploadTokenService other =
                new ContactRequestUploadTokenService("another-secret-key-minimum-32-characters-needed-here");
        ContactRequest cr = request(7L, Instant.EPOCH);
        assertNotEquals(service.issue(cr), other.issue(cr));
        assertFalse(other.verify(cr, service.issue(cr)));
    }
}
