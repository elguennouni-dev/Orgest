package com.orgest.common;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Calcul et validation de l'échéancier (تقسيط). Pur : testable sans base de données. */
public final class InstallmentPlanner {
    private InstallmentPlanner() {}

    public static final int MAX_MONTHS = 36;

    public record Term(int seq, LocalDate dueDate, BigDecimal amount) {}

    /**
     * Règles : client nommé, solde &gt; 0, 1 ≤ mois ≤ 36, 0 ≤ avance &lt; solde.
     * Lève AppException(400) avec un code précis pour que l'écran explique l'erreur.
     */
    public static void validate(String customerName, BigDecimal balance, BigDecimal down, Integer months) {
        if (customerName == null || customerName.isBlank()) throw AppException.bad("CUSTOMER_REQUIRED");
        if (balance == null || balance.signum() <= 0) throw AppException.bad("NO_BALANCE");
        if (months == null || months < 1 || months > MAX_MONTHS) throw AppException.bad("INVALID_MONTHS");
        BigDecimal d = Money.nz(down);
        if (d.signum() < 0) throw AppException.bad("DOWN_NEGATIVE");
        if (d.compareTo(balance) >= 0) throw AppException.bad("DOWN_TOO_HIGH");
    }

    /**
     * Répartit (solde − avance) en centimes : chaque terme vaut le quotient, et les premiers termes
     * absorbent le reste d'un centime. La somme est exacte et l'écart entre termes ne dépasse pas 0,01.
     */
    public static List<Term> schedule(BigDecimal balance, BigDecimal down, int months, LocalDate start) {
        BigDecimal remainder = Money.round2(balance).subtract(Money.round2(Money.nz(down)));
        long total = remainder.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
        long base = total / months;
        long extra = total - base * months;
        List<Term> out = new ArrayList<>(months);
        for (int i = 1; i <= months; i++) {
            long c = base + (i <= extra ? 1 : 0);
            out.add(new Term(i, start.plusMonths(i), BigDecimal.valueOf(c, 2)));
        }
        return out;
    }
}
