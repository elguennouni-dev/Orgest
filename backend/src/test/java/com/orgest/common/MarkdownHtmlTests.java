package com.orgest.common;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class MarkdownHtmlTests {
    @Test void rendersHeadingsListsAndEmphasis() {
        String h = MarkdownHtml.render("## Titre\nUn **gras** et *italique* et `code`.\n\n- a\n- b\n\n1. un\n2. deux\n\n> formule");
        assertTrue(h.contains("<h2>Titre</h2>"));
        assertTrue(h.contains("<strong>gras</strong>") && h.contains("<em>italique</em>") && h.contains("<code>code</code>"));
        assertTrue(h.contains("<ul>\n<li>a</li>\n<li>b</li>\n</ul>"));
        assertTrue(h.contains("<ol>\n<li>un</li>\n<li>deux</li>\n</ol>"));
        assertTrue(h.contains("<blockquote>formule</blockquote>"));
    }

    @Test void neverEmitsRawHtml() {
        String h = MarkdownHtml.render("<script>alert(1)</script> <img src=x onerror=alert(1)>");
        assertFalse(h.contains("<script"));
        assertFalse(h.contains("<img"));
        assertTrue(h.contains("&lt;script&gt;"));
    }

    @Test void onlySafeLinksBecomeAnchors() {
        assertTrue(MarkdownHtml.render("[ok](https://orgest.tech/x)").contains("<a href=\"https://orgest.tech/x\" rel=\"noopener noreferrer\">ok</a>"));
        assertTrue(MarkdownHtml.render("[interne](/blog/abc)").contains("<a href=\"/blog/abc\">interne</a>"));
        String bad = MarkdownHtml.render("[x](javascript:alert(1))");
        assertFalse(bad.contains("<a "));
        assertFalse(MarkdownHtml.render("[x](//evil.com)").contains("<a "));
    }

    @Test void joinsWrappedLinesAndSplitsParagraphs() {
        String h = MarkdownHtml.render("ligne un\nligne deux\n\nautre");
        assertTrue(h.contains("<p>ligne un ligne deux</p>"));
        assertTrue(h.contains("<p>autre</p>"));
    }

    @Test void plainTextStripsMarkup() {
        String t = MarkdownHtml.plain("## Titre\nUn **gras** [lien](https://x.com) `c`\n> cite");
        assertEquals("Titre\nUn gras lien c\ncite", t);
    }
}
