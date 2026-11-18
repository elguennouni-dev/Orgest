package com.orgest.security;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/** Limiteur par IP (fenêtre glissante) contre le brute-force / credential stuffing (A07). */
@Component
public class LoginRateLimiter {
    private static final int MAX = 30;
    private static final long WINDOW_MS = 10 * 60 * 1000L;
    private final ConcurrentHashMap<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    public boolean allowed(String ip) {
        long now = System.currentTimeMillis();
        if (hits.size() > 20_000) hits.clear();
        Deque<Long> q = hits.computeIfAbsent(ip, k -> new ArrayDeque<>());
        synchronized (q) {
            while (!q.isEmpty() && now - q.peekFirst() > WINDOW_MS) q.pollFirst();
            return q.size() < MAX;
        }
    }

    public void record(String ip) {
        Deque<Long> q = hits.computeIfAbsent(ip, k -> new ArrayDeque<>());
        synchronized (q) { q.addLast(System.currentTimeMillis()); }
    }
}
