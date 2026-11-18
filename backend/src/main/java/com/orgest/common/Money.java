package com.orgest.common;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

public final class Money {
    private Money() {}
    public static final ZoneId ZONE = ZoneId.of("Africa/Casablanca");

    public static BigDecimal round2(BigDecimal v) { return v.setScale(2, RoundingMode.HALF_UP); }
    public static BigDecimal round3(BigDecimal v) { return v.setScale(3, RoundingMode.HALF_UP); }
    public static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
    public static Instant startOf(LocalDate d) { return d.atStartOfDay(ZONE).toInstant(); }
    public static LocalDate today() { return LocalDate.now(ZONE); }
}
