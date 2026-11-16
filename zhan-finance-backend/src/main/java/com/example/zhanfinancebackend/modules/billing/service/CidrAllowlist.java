package com.example.zhanfinancebackend.modules.billing.service;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.List;

/** IPv4/IPv6 allowlist of single addresses and CIDR ranges. Fails closed: empty list allows nothing. */
public final class CidrAllowlist {

    private record Range(byte[] network, int prefixBits) {}

    private final List<Range> ranges = new ArrayList<>();

    public CidrAllowlist(List<String> entries) {
        for (String raw : entries) {
            if (raw == null || raw.isBlank()) continue;
            String entry = raw.trim();
            try {
                int slash = entry.indexOf('/');
                String host = slash < 0 ? entry : entry.substring(0, slash);
                byte[] addr = parseLiteral(host);
                int bits = slash < 0 ? addr.length * 8 : Integer.parseInt(entry.substring(slash + 1));
                if (bits < 0 || bits > addr.length * 8) {
                    throw new IllegalArgumentException("Invalid prefix length in allowlist entry: " + entry);
                }
                ranges.add(new Range(addr, bits));
            } catch (UnknownHostException | NumberFormatException e) {
                throw new IllegalArgumentException("Invalid allowlist entry: " + entry, e);
            }
        }
    }

    public boolean isEmpty() {
        return ranges.isEmpty();
    }

    public boolean contains(String ip) {
        if (ip == null || ip.isBlank()) return false;
        byte[] candidate;
        try {
            candidate = parseLiteral(ip.trim());
        } catch (UnknownHostException | IllegalArgumentException e) {
            return false;
        }
        for (Range r : ranges) {
            if (r.network().length == candidate.length && matches(r.network(), candidate, r.prefixBits())) {
                return true;
            }
        }
        return false;
    }

    private static boolean matches(byte[] network, byte[] candidate, int bits) {
        int fullBytes = bits / 8;
        for (int i = 0; i < fullBytes; i++) {
            if (network[i] != candidate[i]) return false;
        }
        int rem = bits % 8;
        if (rem == 0) return true;
        int mask = (0xFF << (8 - rem)) & 0xFF;
        return (network[fullBytes] & mask) == (candidate[fullBytes] & mask);
    }

    /** Accepts only IP literals; never triggers a DNS lookup. */
    private static byte[] parseLiteral(String host) throws UnknownHostException {
        if (!host.matches("[0-9a-fA-F:.]+")) {
            throw new IllegalArgumentException("Not an IP literal: " + host);
        }
        return InetAddress.getByName(host).getAddress();
    }
}
