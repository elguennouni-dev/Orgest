package com.orgest;

import static org.junit.jupiter.api.Assertions.*;

import com.orgest.common.AppException;
import com.orgest.common.InstallmentPlanner;
import com.orgest.common.InstallmentPlanner.Term;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class InstallmentPlannerTests {
    private static BigDecimal d(String s) { return new BigDecimal(s); }
    private static final LocalDate START = LocalDate.of(2026, 1, 31);

    private static BigDecimal sum(List<Term> t) {
        return t.stream().map(Term::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Test
    void evenSplit() {
        List<Term> t = InstallmentPlanner.schedule(d("6000"), d("0"), 6, START);
        assertEquals(6, t.size());
        t.forEach(x -> assertEquals(d("1000.00"), x.amount()));
    }

    @Test
    void sumAlwaysEqualsBalanceMinusDown() {
        for (int months : new int[]{1, 2, 3, 4, 6, 7, 9, 12, 18, 24, 36}) {
            for (String bal : new String[]{"0.01", "1", "99.99", "1000.01", "12345.67", "99999.99"}) {
                BigDecimal b = d(bal);
                BigDecimal down = b.signum() > 0 && b.compareTo(d("1")) > 0 ? d("0.5") : BigDecimal.ZERO;
                List<Term> t = InstallmentPlanner.schedule(b, down, months, START);
                assertEquals(b.subtract(down).setScale(2), sum(t), bal + "/" + months);
                BigDecimal min = t.stream().map(Term::amount).min(BigDecimal::compareTo).get();
                BigDecimal max = t.stream().map(Term::amount).max(BigDecimal::compareTo).get();
                assertTrue(max.subtract(min).compareTo(d("0.01")) <= 0, "spread > 1 cent for " + bal + "/" + months);
            }
        }
    }

    @Test
    void extraCentsGoToFirstTerms() {
        List<Term> t = InstallmentPlanner.schedule(d("100.00"), d("0"), 3, START);
        assertEquals(d("33.34"), t.get(0).amount());
        assertEquals(d("33.33"), t.get(1).amount());
        assertEquals(d("33.33"), t.get(2).amount());
    }

    @Test
    void downPaymentIsDeducted() {
        List<Term> t = InstallmentPlanner.schedule(d("10000"), d("4000"), 6, START);
        assertEquals(d("6000.00"), sum(t));
        t.forEach(x -> assertEquals(d("1000.00"), x.amount()));
    }

    @Test
    void datesAreMonthlyAndClampToMonthEnd() {
        List<Term> t = InstallmentPlanner.schedule(d("300"), d("0"), 3, START); // 31 janvier
        assertEquals(LocalDate.of(2026, 2, 28), t.get(0).dueDate());
        assertEquals(LocalDate.of(2026, 3, 31), t.get(1).dueDate());
        assertEquals(LocalDate.of(2026, 4, 30), t.get(2).dueDate());
        assertEquals(1, t.get(0).seq());
    }

    private static String code(Runnable r) {
        return assertThrows(AppException.class, r::run).code();
    }

    @Test
    void validationRules() {
        InstallmentPlanner.validate("Fatima", d("5000"), d("0"), 6);
        InstallmentPlanner.validate("Fatima", d("5000"), null, 36);
        InstallmentPlanner.validate("Fatima", d("5000"), d("4999.99"), 1);
        assertEquals("CUSTOMER_REQUIRED", code(() -> InstallmentPlanner.validate(" ", d("5000"), d("0"), 6)));
        assertEquals("CUSTOMER_REQUIRED", code(() -> InstallmentPlanner.validate(null, d("5000"), d("0"), 6)));
        assertEquals("NO_BALANCE", code(() -> InstallmentPlanner.validate("F", d("0"), d("0"), 6)));
        assertEquals("NO_BALANCE", code(() -> InstallmentPlanner.validate("F", d("-10"), d("0"), 6)));
        assertEquals("INVALID_MONTHS", code(() -> InstallmentPlanner.validate("F", d("100"), d("0"), 0)));
        assertEquals("INVALID_MONTHS", code(() -> InstallmentPlanner.validate("F", d("100"), d("0"), 37)));
        assertEquals("INVALID_MONTHS", code(() -> InstallmentPlanner.validate("F", d("100"), d("0"), null)));
        assertEquals("DOWN_NEGATIVE", code(() -> InstallmentPlanner.validate("F", d("100"), d("-1"), 3)));
        assertEquals("DOWN_TOO_HIGH", code(() -> InstallmentPlanner.validate("F", d("100"), d("100"), 3)));
        assertEquals("DOWN_TOO_HIGH", code(() -> InstallmentPlanner.validate("F", d("100"), d("150"), 3)));
    }
}
