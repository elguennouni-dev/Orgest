package com.orgest.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Numérotation atomique par commerçant (INSERT .. ON CONFLICT .. RETURNING), sans condition de course. */
@Service
public class CounterService {
    private final JdbcTemplate jdbc;

    public CounterService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public String next(long shopId, String kind, String prefix) {
        Long v = jdbc.queryForObject(
                "INSERT INTO shop_counter (shop_id, kind, value) VALUES (?, ?, 1) "
                        + "ON CONFLICT (shop_id, kind) DO UPDATE SET value = shop_counter.value + 1 RETURNING value",
                Long.class, shopId, kind);
        return prefix + String.format("%05d", v);
    }
}
