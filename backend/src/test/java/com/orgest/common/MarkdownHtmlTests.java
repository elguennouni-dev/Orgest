package com.orgest.common;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class MarkdownHtmlTests {
    @Test void rendersHeadingsListsAndEmphasis() {
        String h = MarkdownHtml.render("## Titre\nUn **gras** et *italique* et `code`.\n\n- a\n- b\n\n1. un\n2. deux\n\n> formule");
        assertTrue(h.contains("<h2 id=\"s1\">Titre</h2>"));
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

    @Test void h2GetSequentialAnchorsAndHeadingsMatch() {
        String src = "## Un\ntexte\n### Sous\n## Deux";
        assertTrue(MarkdownHtml.render(src).contains("<h2 id=\"s1\">Un</h2>") && MarkdownHtml.render(src).contains("<h2 id=\"s2\">Deux</h2>"));
        var hs = MarkdownHtml.headings(src);
        assertEquals(2, hs.size());
        assertEquals("s2", hs.get(1).id());
        assertEquals("Deux", hs.get(1).text());
    }

    @Test void rendersTablesWithHeaderAndEscapesCells() {
        String h = MarkdownHtml.render("| Carat | Or pur |\n| --- | --- |\n| 18K | **75 %** |\n| <b> | 87,5 % |");
        assertTrue(h.contains("<thead><tr><th>Carat</th><th>Or pur</th></tr></thead>"));
        assertTrue(h.contains("<td>18K</td><td><strong>75 %</strong></td>"));
        assertTrue(h.contains("<td>&lt;b&gt;</td>"));
    }

    @Test void twoTablesSeparatedByBlankLineStaySeparate() {
        String h = MarkdownHtml.render("| a |\n| - |\n| 1 |\n\n| b |\n| - |\n| 2 |");
        assertEquals(2, h.split("<table>", -1).length - 1);
    }

    @Test void extractsFaqPairsUnderFaqHeadingOnly() {
        String src = "## Intro\n### Pas une question\nignorée\n\n## Questions fréquentes\n### Q1 ?\nRéponse **un**.\n### Q2 ?\nRéponse deux.";
        var qa = MarkdownHtml.faq(src);
        assertEquals(2, qa.size());
        assertEquals("Q1 ?", qa.get(0)[0]);
        assertEquals("Réponse un.", qa.get(0)[1]);
        assertEquals("Réponse deux.", qa.get(1)[1]);
        assertTrue(MarkdownHtml.faq("## Intro\n### Q ?\nA").isEmpty());
    }
}
