package com.orgest;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.orgest.common.Pricing;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class PricingTests {
    private static BigDecimal d(String s) { return new BigDecimal(s); }

    @Test
    void lineTotalIsWeightTimesPricePlusMaking() {
        assertEquals(d("5550.00"), Pricing.lineTotal(d("7.5"), d("640"), d("100")));
        assertEquals(d("0.00"), Pricing.lineTotal(d("1"), d("0"), d("0")));
    }

    @Test
    void lineTotalRoundsHalfUpToTwoDecimals() {
        // 3.333 × (10.01 + 0) = 33.36333 → 33.36 ; 0.005 case: 1.001 × 5.00 = 5.005 → 5.01
        assertEquals(d("33.36"), Pricing.lineTotal(d("3.333"), d("10.01"), d("0")));
        assertEquals(d("5.01"), Pricing.lineTotal(d("1.001"), d("5.00"), d("0")));
    }

    @Test
    void netWeightAppliesDeduction() {
        assertEquals(d("9.000"), Pricing.netWeight(d("10"), d("10")));
        assertEquals(d("10.000"), Pricing.netWeight(d("10"), d("0")));
        assertEquals(d("0.100"), Pricing.netWeight(d("10"), d("99")));
        assertEquals(d("8.762"), Pricing.netWeight(d("9.876"), d("11.28")));
    }

    @Test
    void tradeInUsesRoundedPrice() {
        assertEquals(d("5040.00"), Pricing.tradeIn(d("9.000"), d("560")));
        assertEquals(d("1000.00"), Pricing.tradeIn(d("2.000"), d("500.004")));
    }
}
