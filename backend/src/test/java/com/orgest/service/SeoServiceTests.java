package com.orgest.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.orgest.common.AppException;
import com.orgest.web.Dtos.PostDto;
import com.orgest.web.Dtos.PostSummary;
import com.orgest.web.Dtos.SubPlanDto;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class SeoServiceTests {
    private static final String BASE = "https://orgest.tech";
    private static final String TEMPLATE = "<!doctype html><html lang=\"fr\"><head><meta charset=\"UTF-8\" /><meta name=\"robots\" content=\"all\" /><title>Orgest</title></head>"
            + "<body><div id=\"root\"><div class=\"splash\"><div class=\"splash-louiz\"><span></span></div></div></div><script type=\"module\" src=\"/src/main.jsx\"></script></body></html>";
    private ContentService content;
    private SeoService seo;

    private static final Instant PUB = Instant.parse("2026-03-01T09:00:00Z");
    private static final Instant UPD = Instant.parse("2026-03-05T09:00:00Z");

    private static PostDto post(String slug, String title, String body, String metaTitle, String metaDesc) {
        return new PostDto(1L, slug, title, "Extrait", body, "Cat", null, null, metaTitle, metaDesc, "or, carat", 3, true, PUB, UPD);
    }

    @BeforeEach
    void setUp(@TempDir Path dir) throws Exception {
        Path index = dir.resolve("index.html");
        Files.writeString(index, TEMPLATE);
        content = mock(ContentService.class);
        seo = new SeoService(content, "", index.toString(), "", "212680376294");
        when(content.publicPlans()).thenReturn(List.of(
                new SubPlanDto(1L, 1, new BigDecimal("200.00"), false, true),
                new SubPlanDto(2L, 12, new BigDecimal("1800.00"), true, true),
                new SubPlanDto(3L, 6, new BigDecimal("999.00"), false, false)));
        when(content.publicPosts()).thenReturn(List.of(new PostSummary(1L, "reprise-or", "Reprise d'or", "Extrait", "Cat", null, null, 3, true, PUB, UPD)));
        when(content.publicPost("reprise-or")).thenReturn(post("reprise-or", "Reprise d'or <b>", "## Étape\nTexte **gras** <script>x</script>", null, null));
        when(content.publicPost("absent")).thenThrow(AppException.notFound());
    }

    @Test void baseUrlUsesForwardedHeadersAndRejectsGarbage() {
        assertEquals("https://orgest.tech", seo.baseUrl("orgest.tech", "127.0.0.1", "https"));
        assertEquals("http://localhost", seo.baseUrl("evil.com/<x>", null, null));
        assertEquals("http://localhost:8080", seo.baseUrl(null, "localhost:8080", "http"));
    }

    @Test void configuredSiteUrlWins() {
        SeoService s = new SeoService(content, "https://orgest.tech/", "", "", "1");
        assertEquals("https://orgest.tech", s.baseUrl("other.com", "other.com", "http"));
    }

    @Test void postPageCarriesMetaCanonicalJsonLdAndContent() {
        SeoService.Page p = seo.post(BASE, "reprise-or");
        assertEquals(200, p.status());
        String h = p.html();
        assertTrue(h.contains("<title>Reprise d&#39;or &lt;b&gt;</title>"));
        assertTrue(h.contains("<link rel=\"canonical\" href=\"https://orgest.tech/blog/reprise-or\" />"));
        assertTrue(h.contains("property=\"og:type\" content=\"article\""));
        assertTrue(h.contains("\"@type\":\"Article\"") && h.contains("\"@type\":\"BreadcrumbList\""));
        assertTrue(h.contains("<h1>Reprise d&#39;or &lt;b&gt;</h1>"));
        assertTrue(h.contains("<h2>Étape</h2>") && h.contains("<strong>gras</strong>"));
        assertEquals(1, h.split("<meta name=\"robots\"", -1).length - 1, "une seule balise robots");
        assertTrue(h.contains("index, follow"));
    }

    @Test void jsonLdCannotBreakOutOfTheScriptTag() {
        when(content.publicPost("reprise-or")).thenReturn(post("reprise-or", "</script><script>alert(1)</script>", "x", null, null));
        String h = seo.post(BASE, "reprise-or").html();
        String ld = h.substring(h.indexOf("application/ld+json"), h.indexOf("</script>", h.indexOf("application/ld+json")));
        assertFalse(ld.contains("<"));
    }

    @Test void explicitMetaTitleAndDescriptionOverrideDefaults() {
        when(content.publicPost("reprise-or")).thenReturn(post("reprise-or", "Titre long de l'article", "x", "Meta titre", "Meta description"));
        String h = seo.post(BASE, "reprise-or").html();
        assertTrue(h.contains("<title>Meta titre</title>"));
        assertTrue(h.contains("<meta name=\"description\" content=\"Meta description\" />"));
    }

    @Test void unknownPostIs404AndNoindex() {
        SeoService.Page p = seo.post(BASE, "absent");
        assertEquals(404, p.status());
        assertTrue(p.html().contains("noindex"));
        assertFalse(p.html().contains("rel=\"canonical\""));
    }

    @Test void homePageHasStructuredDataFaqAndOnlyActivePlans() {
        String h = seo.home(BASE).html();
        for (String t : List.of("\"Organization\"", "\"WebSite\"", "\"SoftwareApplication\"", "\"FAQPage\"", "\"AggregateOffer\"")) assertTrue(h.contains(t), t);
        assertTrue(h.contains("\"lowPrice\":\"200.00\"") && h.contains("\"highPrice\":\"1800.00\""));
        assertFalse(h.contains("999"), "un forfait inactif ne doit pas apparaître");
        assertTrue(h.contains("<h1>"));
        assertTrue(h.contains("href=\"/blog/reprise-or\""));
    }

    @Test void faqPriceIsCheapestPerMonthRoundedUp() {
        // 1 mois = 200 ; 12 mois = 150 par mois -> 150
        String a = seo.faq().stream().filter(f -> f.q().contains("Quel est le prix")).findFirst().orElseThrow().a();
        assertTrue(a.contains("150 DH"), a);
    }

    @Test void robotsBlocksPrivateAreasAndPointsToSitemap() {
        String r = seo.robots(BASE);
        assertTrue(r.contains("Disallow: /app") && r.contains("Disallow: /admin") && r.contains("Disallow: /api/"));
        assertTrue(r.contains("Sitemap: https://orgest.tech/sitemap.xml"));
        assertTrue(r.contains("User-agent: GPTBot") && r.contains("User-agent: ClaudeBot"));
    }

    @Test void sitemapListsHomeBlogAndEveryPublishedPostWithLastmod() {
        String x = seo.sitemap(BASE);
        assertTrue(x.contains("<loc>https://orgest.tech/</loc>"));
        assertTrue(x.contains("<loc>https://orgest.tech/blog</loc>"));
        assertTrue(x.contains("<loc>https://orgest.tech/blog/reprise-or</loc><lastmod>2026-03-05</lastmod>"));
    }

    @Test void llmsTxtFollowsTheConventionAndListsArticles() {
        String l = seo.llms(BASE);
        assertTrue(l.startsWith("# Orgest\n\n> "));
        assertTrue(l.contains("## Articles") && l.contains("- [Reprise d'or](https://orgest.tech/blog/reprise-or): Extrait"));
        String full = seo.llmsFull(BASE);
        assertTrue(full.contains("URL : https://orgest.tech/blog/reprise-or") && full.contains("Texte gras"));
    }

    @Test void feedIsValidRssWithEscapedTitles() {
        String f = seo.feed(BASE);
        assertTrue(f.contains("<rss version=\"2.0\"") && f.contains("<guid isPermaLink=\"true\">https://orgest.tech/blog/reprise-or</guid>"));
        assertTrue(f.contains("<pubDate>Sun, 01 Mar 2026 09:00:00 GMT</pubDate>"));
    }

    @Test void fallsBackToMinimalTemplateWhenIndexIsMissing() {
        SeoService s = new SeoService(content, "", "/nonexistent/index.html", "", "1");
        String h = s.blog(BASE).html();
        assertTrue(h.contains("<title>") && h.contains("rel=\"canonical\""));
    }
}
