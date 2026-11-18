package com.orgest.common;

public final class Text {
    private Text() {}

    /** Nettoie une chaîne pour les journaux (anti log-injection) et tronque. */
    public static String clean(String s, int max) {
        if (s == null) return null;
        String t = s.replaceAll("[\\r\\n\\t\\p{Cntrl}]", " ").trim();
        return t.length() > max ? t.substring(0, max) : t;
    }

    public static String blankToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
