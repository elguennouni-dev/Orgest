package com.orgest.service;

import com.orgest.common.AppException;
import java.security.SecureRandom;

public final class PasswordPolicy {
    private PasswordPolicy() {}
    private static final String ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RNG = new SecureRandom();

    public static void check(String password, String username) {
        if (password == null || password.length() < 8 || password.length() > 128) throw AppException.bad("WEAK_PASSWORD");
        if (username != null && password.equalsIgnoreCase(username)) throw AppException.bad("WEAK_PASSWORD");
        boolean letter = password.chars().anyMatch(Character::isLetter);
        boolean digit = password.chars().anyMatch(Character::isDigit);
        if (!letter || !digit) throw AppException.bad("WEAK_PASSWORD");
    }

    /** Mot de passe aléatoire lisible (sans caractères ambigus), garanti lettre + chiffre. */
    public static String generate() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 12; i++) sb.append(ALPHABET.charAt(RNG.nextInt(ALPHABET.length())));
        sb.setCharAt(RNG.nextInt(6), (char) ('2' + RNG.nextInt(8)));
        sb.setCharAt(6 + RNG.nextInt(6), (char) ('a' + RNG.nextInt(8)));
        return sb.toString();
    }
}
