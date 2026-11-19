package com.orgest.common;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Règles de calcul des prix (pures, sans Spring) : lignes, poids net, reprise d'or. */
public final class Pricing {
    private Pricing() {}

    /** poids × (prix/g + façon/g), arrondi à 2 décimales (HALF_UP). */
    public static BigDecimal lineTotal(BigDecimal weightG, BigDecimal pricePerGram, BigDecimal makingPerGram) {
        return Money.round2(Money.round3(weightG).multiply(Money.round2(pricePerGram).add(Money.round2(makingPerGram))));
    }

    /** brut(3 déc.) × (1 − déduction(2 déc.)/100), arrondi à 3 décimales. */
    public static BigDecimal netWeight(BigDecimal grossG, BigDecimal deductionPct) {
        BigDecimal factor = BigDecimal.ONE.subtract(Money.round2(deductionPct).divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP));
        return Money.round3(Money.round3(grossG).multiply(factor));
    }

    public static BigDecimal tradeIn(BigDecimal netWeightG, BigDecimal pricePerGram) {
        return Money.round2(netWeightG.multiply(Money.round2(pricePerGram)));
    }
}
