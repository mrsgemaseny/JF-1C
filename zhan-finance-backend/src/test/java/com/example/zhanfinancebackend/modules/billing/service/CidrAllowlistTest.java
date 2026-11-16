package com.example.zhanfinancebackend.modules.billing.service;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CidrAllowlistTest {

    @Test
    void emptyListAllowsNothing() {
        CidrAllowlist list = new CidrAllowlist(List.of("", "  "));
        assertTrue(list.isEmpty());
        assertFalse(list.contains("10.0.0.1"));
    }

    @Test
    void singleAddressMatchesExactlyOnly() {
        CidrAllowlist list = new CidrAllowlist(List.of("203.0.113.5"));
        assertTrue(list.contains("203.0.113.5"));
        assertFalse(list.contains("203.0.113.6"));
    }

    @Test
    void cidrRangeMatchesBoundaries() {
        CidrAllowlist list = new CidrAllowlist(List.of("198.51.100.8/29"));
        assertTrue(list.contains("198.51.100.8"));
        assertTrue(list.contains("198.51.100.15"));
        assertFalse(list.contains("198.51.100.16"));
        assertFalse(list.contains("198.51.100.7"));
    }

    @Test
    void ipv4AndIpv6AreNotMixed() {
        CidrAllowlist list = new CidrAllowlist(List.of("10.0.0.0/8"));
        assertFalse(list.contains("::1"));
    }

    @Test
    void garbageCandidateIsRejectedWithoutDnsLookup() {
        CidrAllowlist list = new CidrAllowlist(List.of("10.0.0.0/8"));
        assertFalse(list.contains("example.com"));
        assertFalse(list.contains(null));
        assertFalse(list.contains(""));
    }

    @Test
    void invalidConfigurationFailsFast() {
        assertThrows(IllegalArgumentException.class, () -> new CidrAllowlist(List.of("not-an-ip")));
        assertThrows(IllegalArgumentException.class, () -> new CidrAllowlist(List.of("10.0.0.0/99")));
    }
}
