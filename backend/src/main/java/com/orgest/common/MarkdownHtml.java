package com.orgest.common;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Rendu Markdown → HTML (même sous‑ensemble que {@code Markdown.jsx} côté React) : titres ##/###, listes, citations,
 * gras, italique, code, liens. Aucun HTML brut accepté : tout est échappé, les liens sont limités à http(s)/relatif/mailto.
 */
public final class MarkdownHtml {
    private MarkdownHtml() {}

    private static final Pattern INLINE = Pattern.compile("(\\*\\*[^*]+\\*\\*|\\*[^*\\s][^*]*\\*|`[^`]+`|\\[[^\\]]+\\]\\([^)\\s]+\\))");
    private static final Pattern LINK = Pattern.compile("^\\[([^\\]]+)]\\(([^)\\s]+)\\)$");
    private static final Pattern SAFE_URL = Pattern.compile("^(https?://|/(?!/)|#|mailto:).*", Pattern.CASE_INSENSITIVE);
    private static final Pattern H = Pattern.compile("^(#{2,3})\\s+(.+)$");
    private static final Pattern UL = Pattern.compile("^[-*]\\s+(.+)$");
    private static final Pattern OL = Pattern.compile("^\\d+[.)]\\s+(.+)$");
    private static final Pattern Q = Pattern.compile("^>\\s?(.*)$");

    public static String escape(String s) {
        if (s == null) return "";
        StringBuilder b = new StringBuilder(s.length() + 16);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '&' -> b.append("&amp;");
                case '<' -> b.append("&lt;");
                case '>' -> b.append("&gt;");
                case '"' -> b.append("&quot;");
                case '\'' -> b.append("&#39;");
                default -> b.append(c);
            }
        }
        return b.toString();
    }

    static String inline(String text) {
        StringBuilder out = new StringBuilder();
        Matcher m = INLINE.matcher(text);
        int last = 0;
        while (m.find()) {
            out.append(escape(text.substring(last, m.start())));
            String tok = m.group();
            if (tok.startsWith("**")) out.append("<strong>").append(inline(tok.substring(2, tok.length() - 2))).append("</strong>");
            else if (tok.startsWith("`")) out.append("<code>").append(escape(tok.substring(1, tok.length() - 1))).append("</code>");
            else if (tok.startsWith("[")) {
                Matcher lm = LINK.matcher(tok);
                if (lm.matches() && SAFE_URL.matcher(lm.group(2)).matches()) {
                    boolean ext = lm.group(2).regionMatches(true, 0, "http", 0, 4);
                    out.append("<a href=\"").append(escape(lm.group(2))).append('"').append(ext ? " rel=\"noopener noreferrer\"" : "").append('>')
                       .append(escape(lm.group(1))).append("</a>");
                } else out.append(escape(tok));
            } else out.append("<em>").append(escape(tok.substring(1, tok.length() - 1))).append("</em>");
            last = m.end();
        }
        out.append(escape(text.substring(last)));
        return out.toString();
    }

    private record Block(String type, List<String> items) {}

    private static List<Block> parse(String source) {
        List<Block> blocks = new ArrayList<>();
        List<String> buf = new ArrayList<>();
        Block[] list = {null};
        Runnable flush = () -> { if (!buf.isEmpty()) { blocks.add(new Block("p", List.of(String.join(" ", buf)))); buf.clear(); } };
        Runnable flushList = () -> { if (list[0] != null) { blocks.add(list[0]); list[0] = null; } };
        for (String raw : (source == null ? "" : source).replace("\r", "").split("\n", -1)) {
            String l = raw.stripTrailing();
            Matcher m;
            if (l.isBlank()) { flush.run(); flushList.run(); continue; }
            if ((m = H.matcher(l)).matches()) { flush.run(); flushList.run(); blocks.add(new Block("h" + m.group(1).length(), List.of(m.group(2)))); continue; }
            if ((m = UL.matcher(l)).matches()) { flush.run(); if (list[0] == null || !list[0].type.equals("ul")) { flushList.run(); list[0] = new Block("ul", new ArrayList<>()); } list[0].items.add(m.group(1)); continue; }
            if ((m = OL.matcher(l)).matches()) { flush.run(); if (list[0] == null || !list[0].type.equals("ol")) { flushList.run(); list[0] = new Block("ol", new ArrayList<>()); } list[0].items.add(m.group(1)); continue; }
            if ((m = Q.matcher(l)).matches()) { flush.run(); flushList.run(); blocks.add(new Block("q", List.of(m.group(1)))); continue; }
            flushList.run();
            buf.add(l.strip());
        }
        flush.run(); flushList.run();
        return blocks;
    }

    public static String render(String source) {
        StringBuilder sb = new StringBuilder();
        for (Block b : parse(source)) {
            switch (b.type) {
                case "h2" -> sb.append("<h2>").append(inline(b.items.get(0))).append("</h2>\n");
                case "h3" -> sb.append("<h3>").append(inline(b.items.get(0))).append("</h3>\n");
                case "ul", "ol" -> {
                    sb.append('<').append(b.type).append(">\n");
                    for (String it : b.items) sb.append("<li>").append(inline(it)).append("</li>\n");
                    sb.append("</").append(b.type).append(">\n");
                }
                case "q" -> sb.append("<blockquote>").append(inline(b.items.get(0))).append("</blockquote>\n");
                default -> sb.append("<p>").append(inline(b.items.get(0))).append("</p>\n");
            }
        }
        return sb.toString();
    }

    /** Texte brut (sans balisage) pour llms-full.txt et les extraits. */
    public static String plain(String source) {
        String s = (source == null ? "" : source).replace("\r", "");
        s = s.replaceAll("\\[([^\\]]+)]\\([^)\\s]+\\)", "$1").replaceAll("\\*\\*([^*]+)\\*\\*", "$1").replaceAll("`([^`]+)`", "$1");
        return s.replaceAll("(?m)^#{2,3}\\s+", "").replaceAll("(?m)^>\\s?", "");
    }
}
