package com.orgest.service;

import com.orgest.common.AppException;
import com.orgest.common.Json;
import com.orgest.common.MarkdownHtml;
import com.orgest.web.Dtos.PostDto;
import com.orgest.web.Dtos.PostSummary;
import com.orgest.web.Dtos.SubPlanDto;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * SEO : pages d'entrée rendues côté serveur (title, meta, canonical, Open Graph, JSON‑LD, contenu lisible sans JavaScript)
 * et fichiers pour robots / IA (robots.txt, llms.txt, sitemap.xml, flux RSS). Tout est dérivé de la base : rien à maintenir à la main.
 */
@Service
public class SeoService {
    public static final String BRAND = "Orgest";
    public static final String INSTAGRAM = "https://www.instagram.com/orgest.ma/";
    public static final String HOME_TITLE = "Orgest — Logiciel de gestion pour bijouteries au Maroc";
    public static final String HOME_DESC = "Orgest gère le stock au gramme, les ventes, l’échange d’or ancien, les ventes à tempérament et l’atelier de votre bijouterie. Essai gratuit, en français et en arabe.";
    public static final String BLOG_TITLE = "Blog Orgest — Conseils pour bijoutiers : or, stock, à tempérament";
    public static final String BLOG_DESC = "Guides courts et concrets pour les bijoutiers : cours de l’or, reprise d’or ancien, ventes à tempérament, inventaire et gestion de boutique.";
    private static final Pattern HOST = Pattern.compile("^[A-Za-z0-9.-]{1,100}(:\\d{1,5})?$");
    private static final Pattern TITLE = Pattern.compile("<title>.*?</title>", Pattern.DOTALL);
    private static final Pattern HTML_TAG = Pattern.compile("<html[^>]*>");
    private static final Pattern ROBOTS_META = Pattern.compile("<meta[^>]+name=\"robots\"[^>]*>");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ISO_LOCAL_DATE.withZone(ZoneOffset.UTC);
    private static final DateTimeFormatter RFC822 = DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss 'GMT'", java.util.Locale.ENGLISH).withZone(ZoneOffset.UTC);
    static final String DISCLAIMER_FR = "Ce guide est informatif : les prix et pourcentages cités sont des exemples et ne remplacent ni votre prix du jour, ni l’avis d’un comptable ou d’un juriste.";
    static final String DISCLAIMER_AR = "هذا الدليل للإخبار والتوضيح فقط: الأثمنة والنسب المذكورة أمثلة ولا تغني عن ثمن اليوم المعتمد عندك ولا عن استشارة محاسب أو مستشار قانوني.";
    private static final String FALLBACK_TEMPLATE = "<!doctype html><html lang=\"fr\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>Orgest</title></head><body><div id=\"root\"></div></body></html>";

    private final ContentService content;
    private final String siteUrl;
    private final String indexFile;
    private final String indexUrl;
    private final String whatsapp;
    private volatile String cachedTemplate;
    private volatile long cachedAt;

    public SeoService(ContentService content,
                      @Value("${orgest.site-url:}") String siteUrl,
                      @Value("${orgest.index-file:}") String indexFile,
                      @Value("${orgest.index-url:}") String indexUrl,
                      @Value("${orgest.whatsapp:212730819719}") String whatsapp) {
        this.content = content;
        this.siteUrl = siteUrl == null ? "" : siteUrl.replaceAll("/+$", "");
        this.indexFile = indexFile;
        this.indexUrl = indexUrl;
        this.whatsapp = whatsapp;
    }

    // ---------- Base URL ----------
    public String baseUrl(String forwardedHost, String host, String forwardedProto) {
        if (!siteUrl.isBlank()) return siteUrl;
        String h = forwardedHost != null ? forwardedHost : host;
        if (h == null || !HOST.matcher(h).matches()) h = "localhost";
        return ("https".equalsIgnoreCase(forwardedProto) ? "https" : "http") + "://" + h;
    }

    // ---------- FAQ (source unique : page d'accueil + JSON-LD + /api/public/faq) ----------
    public record Faq(String q, String a) {}

    public List<Faq> faq() {
        String from = cheapest(content.publicPlans());
        List<Faq> l = new ArrayList<>();
        l.add(new Faq("Qu’est-ce qu’Orgest ?", "Orgest est un logiciel en ligne de gestion pour bijouteries et commerçants d’or au Maroc : stock au gramme, ventes, échange d’or ancien, ventes à tempérament, suivi de l’atelier et rapports, depuis un ordinateur, une tablette ou un téléphone."));
        l.add(new Faq("Orgest convient-il à une petite bijouterie ?", "Oui. L’application est pensée pour le comptoir : une seule personne peut saisir le cours du jour, encaisser une vente et imprimer le reçu en quelques secondes."));
        l.add(new Faq("Peut-on gérer les ventes à tempérament (paiement échelonné) ?", "Oui. Orgest calcule l’acompte, le reste à payer et un échéancier mensuel exact au centime, puis suit chaque paiement et les retards pour vous aider à relancer vos clients, par exemple sur WhatsApp."));
        l.add(new Faq("Comment Orgest calcule-t-il le prix d’un bijou en or ?", "Le prix se calcule à partir du poids, du prix du jour par carat (18K, 21K, 24K) et de la main d’œuvre. L’or ancien repris en échange est converti en poids net puis déduit automatiquement du total, et tout figure sur le reçu."));
        l.add(new Faq("Le stock est-il suivi pièce par pièce ?", "Oui. Chaque article garde sa photo, son carat, son poids et sa quantité. Quand un article est vendu, il reste dans l’historique avec une quantité à zéro au lieu d’être supprimé."));
        l.add(new Faq("Orgest existe-t-il en arabe ?", "Oui. L’interface est disponible en français et en arabe (de droite à gauche), et la langue choisie est conservée d’un écran à l’autre."));
        l.add(new Faq("Quel est le prix d’Orgest ?", from == null ? "Les abonnements existent en plusieurs durées, avec toutes les fonctionnalités incluses. Consultez la section tarifs de la page d’accueil ou écrivez-nous sur WhatsApp."
                : "Les abonnements démarrent à partir de " + from + " DH par mois, avec toutes les fonctionnalités incluses et un support par WhatsApp."));
        l.add(new Faq("Comment essayer Orgest ?", "Contactez-nous sur WhatsApp au +" + whatsapp + " : nous créons votre boutique et vous montrons l’application avec vos propres articles."));
        return l;
    }

    private static String cheapest(List<SubPlanDto> plans) {
        BigDecimal best = null;
        for (SubPlanDto p : plans) {
            if (!p.active() || p.months() <= 0) continue;
            BigDecimal per = p.price().divide(BigDecimal.valueOf(p.months()), 0, RoundingMode.CEILING);
            if (best == null || per.compareTo(best) < 0) best = per;
        }
        return best == null ? null : best.toPlainString();
    }

    // ---------- Pages ----------
    public record Page(int status, String html) {}

    public Page home(String base) {
        List<SubPlanDto> plans = content.publicPlans().stream().filter(SubPlanDto::active).toList();
        List<Faq> faq = faq();
        StringBuilder b = new StringBuilder();
        b.append("<main class=\"seo-static\"><h1>").append(esc(BRAND)).append(" : le logiciel de gestion des bijouteries au Maroc</h1>\n")
         .append("<p>").append(esc(HOME_DESC)).append("</p>\n<h2>Fonctionnalités</h2>\n<ul>\n")
         .append("<li><strong>Stock au gramme</strong> : carat, poids, catégorie, photo et quantité de chaque bijou.</li>\n")
         .append("<li><strong>Ventes et reçus</strong> : prix du jour, main d’œuvre, reçu imprimable (A5 ou ticket 80 mm).</li>\n")
         .append("<li><strong>Échange et reprise d’or ancien</strong> : poids net déduit automatiquement du total.</li>\n")
         .append("<li><strong>Ventes à tempérament</strong> : acompte, échéancier exact au centime, suivi des retards et rappels WhatsApp.</li>\n")
         .append("<li><strong>Atelier</strong> : or confié à l’artisan, poids remis et rendu, perte.</li>\n")
         .append("<li><strong>Rapports</strong> : ventes, achats d’or, marge, export Excel.</li>\n")
         .append("<li><strong>Français et arabe</strong> : interface de droite à gauche incluse.</li>\n</ul>\n");
        if (!plans.isEmpty()) {
            b.append("<h2>Tarifs</h2>\n<ul>\n");
            for (SubPlanDto p : plans) b.append("<li>").append(p.months()).append(p.months() > 1 ? " mois" : " mois").append(" : ").append(p.price().stripTrailingZeros().toPlainString()).append(" DH</li>\n");
            b.append("</ul>\n");
        }
        b.append("<h2>Questions fréquentes</h2>\n");
        for (Faq f : faq) b.append("<h3>").append(esc(f.q())).append("</h3>\n<p>").append(esc(f.a())).append("</p>\n");
        List<PostSummary> posts = content.publicPosts();
        if (!posts.isEmpty()) {
            b.append("<h2>Derniers articles du blog</h2>\n<ul>\n");
            for (PostSummary p : posts.stream().limit(6).toList()) b.append("<li><a href=\"/blog/").append(esc(p.slug())).append("\">").append(esc(p.title())).append("</a></li>\n");
            b.append("</ul>\n<p><a href=\"/blog\">Tous les articles</a></p>\n");
        }
        b.append("<p><a href=\"/login\">Connexion</a></p></main>");

        Map<String, Object> org = new LinkedHashMap<>();
        org.put("@type", "Organization"); org.put("@id", base + "/#organization"); org.put("name", BRAND); org.put("url", base + "/");
        org.put("logo", base + "/assets/icon-512.png");
        org.put("sameAs", List.of(INSTAGRAM));
        org.put("contactPoint", List.of(Map.of("@type", "ContactPoint", "contactType", "customer support", "telephone", "+" + whatsapp, "availableLanguage", List.of("fr", "ar"))));
        Map<String, Object> site = new LinkedHashMap<>();
        site.put("@type", "WebSite"); site.put("@id", base + "/#website"); site.put("url", base + "/"); site.put("name", BRAND);
        site.put("inLanguage", "fr"); site.put("publisher", Map.of("@id", base + "/#organization"));
        Map<String, Object> app = new LinkedHashMap<>();
        app.put("@type", "SoftwareApplication"); app.put("name", BRAND); app.put("applicationCategory", "BusinessApplication");
        app.put("operatingSystem", "Web"); app.put("description", HOME_DESC); app.put("url", base + "/"); app.put("inLanguage", List.of("fr", "ar"));
        if (!plans.isEmpty()) {
            BigDecimal low = plans.stream().map(SubPlanDto::price).min(BigDecimal::compareTo).get();
            BigDecimal high = plans.stream().map(SubPlanDto::price).max(BigDecimal::compareTo).get();
            Map<String, Object> offer = new LinkedHashMap<>();
            offer.put("@type", "AggregateOffer"); offer.put("priceCurrency", "MAD"); offer.put("lowPrice", low.toPlainString()); offer.put("highPrice", high.toPlainString());
            offer.put("offerCount", plans.size());
            app.put("offers", offer);
        }
        Map<String, Object> faqLd = new LinkedHashMap<>();
        faqLd.put("@type", "FAQPage");
        faqLd.put("mainEntity", faq.stream().map(f -> Map.of("@type", "Question", "name", f.q(), "acceptedAnswer", Map.of("@type", "Answer", "text", f.a()))).toList());
        return new Page(200, build(new Meta(HOME_TITLE, HOME_DESC, base + "/", "website", base + "/assets/icon-512.png", null, true,
                "orgest, logiciel bijouterie maroc, gestion bijouterie, stock or, vente à tempérament, caisse bijoutier", "fr"),
                b.toString(), List.of(org, site, app, faqLd)));
    }

    static final String BLOG_TITLE_AR = "مدونة Orgest — نصائح لأصحاب محلات الذهب: الذهب، السلعة، التقسيط";
    static final String BLOG_DESC_AR = "أدلة قصيرة وعملية لأصحاب محلات المجوهرات: ثمن الذهب، شراء الذهب القديم، البيع بالتقسيط، الجرد وتدبير المحل.";

    /** /blog : page d'accueil du blog avec le choix de la langue (chaque langue a sa propre page). */
    public Page blog(String base) {
        StringBuilder b = new StringBuilder("<main class=\"seo-static\"><h1>Blog Orgest · مدونة Orgest</h1>\n");
        b.append("<p><a href=\"/blog/fr\" hreflang=\"fr\" lang=\"fr\">Lire le blog en français</a></p>\n");
        b.append("<p><a href=\"/blog/ar\" hreflang=\"ar\" lang=\"ar\" dir=\"rtl\">اقرأ المدونة بالعربية</a></p>\n<p><a href=\"/\">Accueil</a></p></main>");
        Map<String, Object> coll = new LinkedHashMap<>();
        coll.put("@type", "CollectionPage"); coll.put("name", "Blog Orgest"); coll.put("url", base + "/blog");
        coll.put("isPartOf", Map.of("@id", base + "/#website"));
        return new Page(200, build(new Meta(BLOG_TITLE, BLOG_DESC, base + "/blog", "website", base + "/assets/icon-512.png", null, true, null, "fr"),
                b.toString(), List.of(coll, breadcrumb(base, null, null, "fr")), blogAlternates(base)));
    }

    private String blogAlternates(String base) {
        return "    <link rel=\"alternate\" hreflang=\"fr\" href=\"" + esc(base + "/blog/fr") + "\" />\n"
             + "    <link rel=\"alternate\" hreflang=\"ar\" href=\"" + esc(base + "/blog/ar") + "\" />\n"
             + "    <link rel=\"alternate\" hreflang=\"x-default\" href=\"" + esc(base + "/blog") + "\" />\n";
    }

    /** /blog/fr et /blog/ar : uniquement les articles de la langue demandée. */
    public Page blog(String base, String lang) {
        boolean ar = "ar".equals(lang);
        String l = ar ? "ar" : "fr";
        List<PostSummary> posts = content.publicPosts().stream().filter(p -> l.equals(p.lang() == null ? "fr" : p.lang())).toList();
        String title = ar ? BLOG_TITLE_AR : BLOG_TITLE, desc = ar ? BLOG_DESC_AR : BLOG_DESC;
        StringBuilder b = new StringBuilder("<main class=\"seo-static\" lang=\"" + l + "\" dir=\"" + (ar ? "rtl" : "ltr") + "\"><h1>")
                .append(ar ? "مدونة Orgest: نصائح لأصحاب محلات الذهب" : "Le blog Orgest : conseils pour bijoutiers").append("</h1>\n<p>").append(esc(desc)).append("</p>\n");
        List<Map<String, Object>> items = new ArrayList<>();
        int i = 1;
        for (PostSummary p : posts) {
            b.append("<article><h2><a href=\"/blog/").append(esc(p.slug())).append("\">").append(esc(p.title())).append("</a></h2>");
            if (p.category() != null) b.append("<p><em>").append(esc(p.category())).append("</em></p>");
            if (p.excerpt() != null) b.append("<p>").append(esc(p.excerpt())).append("</p>");
            b.append("</article>\n");
            items.add(Map.of("@type", "ListItem", "position", i++, "url", base + "/blog/" + p.slug(), "name", p.title()));
        }
        b.append("<p><a href=\"/blog/").append(ar ? "fr\" hreflang=\"fr\" lang=\"fr\">Français" : "ar\" hreflang=\"ar\" lang=\"ar\">العربية").append("</a> · <a href=\"/\">").append(ar ? "الرئيسية" : "Accueil").append("</a></p></main>");
        Map<String, Object> coll = new LinkedHashMap<>();
        coll.put("@type", "CollectionPage"); coll.put("name", title); coll.put("url", base + "/blog/" + l); coll.put("description", desc); coll.put("inLanguage", l);
        coll.put("isPartOf", Map.of("@id", base + "/#website"));
        if (!items.isEmpty()) coll.put("mainEntity", Map.of("@type", "ItemList", "itemListElement", items));
        return new Page(200, build(new Meta(title, desc, base + "/blog/" + l, "website", base + "/assets/icon-512.png", null, true, null, l),
                b.toString(), List.of(coll, breadcrumb(base, null, null, l)), blogAlternates(base)));
    }

    public Page post(String base, String slug) {
        PostDto p;
        try { p = content.publicPost(slug); }
        catch (AppException e) {
            String html = build(new Meta("Article introuvable — " + BRAND, "Cet article n’existe pas ou n’est plus publié.", base + "/blog", "website", null, null, false, null, "fr"),
                    "<main class=\"seo-static\"><h1>Article introuvable</h1><p><a href=\"/blog\">Retour au blog</a></p></main>", List.of());
            return new Page(404, html);
        }
        String url = base + "/blog/" + p.slug();
        String img = p.cover() != null ? base + "/api/public/blog-cover/" + p.cover() : base + "/assets/icon-512.png";
        String title = blank(p.metaTitle()) ? p.title() : p.metaTitle();
        String desc = !blank(p.metaDescription()) ? p.metaDescription() : (!blank(p.excerpt()) ? p.excerpt() : snippet(p.content(), 160));
        boolean ar = "ar".equals(p.lang());
        String lang = ar ? "ar" : "fr";
        StringBuilder b = new StringBuilder("<main class=\"seo-static\"><article lang=\"" + lang + "\" dir=\"" + (ar ? "rtl" : "ltr") + "\">\n<nav><a href=\"/blog/" + lang + "\">" + (ar ? "المدونة" : "Blog") + "</a>");
        if (!blank(p.category())) b.append(" › ").append(esc(p.category()));
        b.append("</nav>\n<h1>").append(esc(p.title())).append("</h1>\n");
        if (p.cover() != null) b.append("<img src=\"").append(esc(img)).append("\" alt=\"").append(esc(blank(p.coverAlt()) ? p.title() : p.coverAlt())).append("\">\n");
        List<MarkdownHtml.Heading> toc = MarkdownHtml.headings(p.content());
        if (toc.size() >= 3) {
            b.append("<nav aria-label=\"").append(ar ? "فهرس المقال" : "Sommaire").append("\"><ol>");
            for (MarkdownHtml.Heading h : toc) b.append("<li><a href=\"#").append(h.id()).append("\">").append(esc(h.text())).append("</a></li>");
            b.append("</ol></nav>\n");
        }
        b.append(MarkdownHtml.render(p.content()));
        b.append("<p><em>").append(ar ? DISCLAIMER_AR : DISCLAIMER_FR).append("</em></p></article></main>");
        Map<String, Object> art = new LinkedHashMap<>();
        art.put("@type", "Article"); art.put("headline", p.title()); art.put("description", desc); art.put("image", List.of(img));
        art.put("datePublished", (p.publishedAt() != null ? p.publishedAt() : p.updatedAt()).toString()); art.put("dateModified", p.updatedAt().toString());
        art.put("inLanguage", lang); art.put("mainEntityOfPage", Map.of("@type", "WebPage", "@id", url));
        art.put("author", Map.of("@type", "Organization", "name", (ar ? "فريق " : "Équipe ") + BRAND, "url", base + "/"));
        art.put("publisher", Map.of("@type", "Organization", "name", BRAND, "logo", Map.of("@type", "ImageObject", "url", base + "/assets/icon-512.png")));
        if (!blank(p.keywords())) art.put("keywords", p.keywords());
        List<Map<String, Object>> ld = new ArrayList<>(List.of(art, breadcrumb(base, p.title(), url, lang)));
        List<String[]> qa = MarkdownHtml.faq(p.content());
        if (!qa.isEmpty()) {
            Map<String, Object> f = new LinkedHashMap<>();
            f.put("@type", "FAQPage");
            f.put("mainEntity", qa.stream().map(x -> Map.of("@type", "Question", "name", x[0], "acceptedAnswer", Map.of("@type", "Answer", "text", x[1]))).toList());
            ld.add(f);
        }
        return new Page(200, build(new Meta(title, desc, url, "article", img, p.updatedAt(), true, p.keywords(), lang), b.toString(), ld));
    }

    private Map<String, Object> breadcrumb(String base, String title, String url) { return breadcrumb(base, title, url, "fr"); }

    private Map<String, Object> breadcrumb(String base, String title, String url, String lang) {
        List<Map<String, Object>> l = new ArrayList<>();
        l.add(Map.of("@type", "ListItem", "position", 1, "name", "Accueil", "item", base + "/"));
        l.add(Map.of("@type", "ListItem", "position", 2, "name", "ar".equals(lang) ? "المدونة" : "Blog", "item", base + "/blog/" + lang));
        if (title != null) l.add(Map.of("@type", "ListItem", "position", 3, "name", title, "item", url));
        return Map.of("@type", "BreadcrumbList", "itemListElement", l);
    }

    // ---------- Outils gratuits ----------
    public static final String TOOLS_TITLE = "Outils gratuits pour bijoutiers — reprise d’or, carats, échéancier";
    public static final String TOOLS_DESC = "Calculateurs gratuits pour bijoutiers au Maroc : reprise d’or ancien, conversion des carats, échéancier à tempérament au centime. أدوات مجانية لأصحاب محلات الذهب.";

    public Page tools(String base) {
        StringBuilder b = new StringBuilder("<main class=\"seo-static\"><h1>Outils gratuits pour bijoutiers · أدوات مجانية لأصحاب محلات الذهب</h1>\n<p>").append(esc(TOOLS_DESC)).append("</p>\n");
        List<Map<String, Object>> items = new ArrayList<>();
        int i = 1;
        for (ToolCatalog.Tool t : ToolCatalog.ALL) {
            b.append("<article lang=\"").append(t.lang()).append("\"><h2><a href=\"/outils/").append(t.slug()).append("\">").append(esc(t.title())).append("</a></h2><p>").append(esc(t.description())).append("</p></article>\n");
            items.add(Map.of("@type", "ListItem", "position", i++, "url", base + "/outils/" + t.slug(), "name", t.title()));
        }
        b.append("<p><a href=\"/\">Accueil</a></p></main>");
        Map<String, Object> coll = new LinkedHashMap<>();
        coll.put("@type", "CollectionPage"); coll.put("name", TOOLS_TITLE); coll.put("url", base + "/outils"); coll.put("description", TOOLS_DESC);
        coll.put("isPartOf", Map.of("@id", base + "/#website")); coll.put("mainEntity", Map.of("@type", "ItemList", "itemListElement", items));
        Map<String, Object> bc = Map.of("@type", "BreadcrumbList", "itemListElement", List.of(
                Map.of("@type", "ListItem", "position", 1, "name", "Accueil", "item", base + "/"),
                Map.of("@type", "ListItem", "position", 2, "name", "Outils", "item", base + "/outils")));
        return new Page(200, build(new Meta(TOOLS_TITLE, TOOLS_DESC, base + "/outils", "website", base + "/assets/icon-512.png", null, true, null, "fr"), b.toString(), List.of(coll, bc)));
    }

    public Page tool(String base, String slug) {
        java.util.Optional<ToolCatalog.Tool> found = ToolCatalog.bySlug(slug);
        if (found.isEmpty()) {
            return new Page(404, build(new Meta("Outil introuvable — " + BRAND, "Cet outil n’existe pas.", base + "/outils", "website", null, null, false, null, "fr"),
                    "<main class=\"seo-static\"><h1>Outil introuvable</h1><p><a href=\"/outils\">Tous les outils</a></p></main>", List.of()));
        }
        ToolCatalog.Tool t = found.get();
        boolean ar = "ar".equals(t.lang());
        String url = base + "/outils/" + t.slug();
        StringBuilder b = new StringBuilder("<main class=\"seo-static\"><article lang=\"" + t.lang() + "\" dir=\"" + (ar ? "rtl" : "ltr") + "\">\n<nav><a href=\"/outils\">" + (ar ? "الأدوات" : "Outils") + "</a></nav>\n<h1>")
            .append(esc(t.title())).append("</h1>\n<p>").append(esc(t.intro())).append("</p>\n<h2>").append(ar ? "المعادلة" : "La formule").append("</h2>\n<p>")
            .append(esc(t.formula())).append("</p>\n<p>").append(esc(t.example())).append("</p>\n<h2>").append(ar ? "أسئلة متكررة" : "Questions fréquentes").append("</h2>\n");
        for (ToolCatalog.Faq f : t.faq()) b.append("<h3>").append(esc(f.q())).append("</h3>\n<p>").append(esc(f.a())).append("</p>\n");
        b.append("<p><em>").append(ar ? DISCLAIMER_AR : DISCLAIMER_FR).append("</em></p></article></main>");
        Map<String, Object> app = new LinkedHashMap<>();
        app.put("@type", "WebApplication"); app.put("name", t.title()); app.put("url", url); app.put("description", t.description());
        app.put("applicationCategory", "BusinessApplication"); app.put("operatingSystem", "Web"); app.put("inLanguage", t.lang()); app.put("isAccessibleForFree", true);
        app.put("offers", Map.of("@type", "Offer", "price", "0", "priceCurrency", "MAD"));
        app.put("publisher", Map.of("@id", base + "/#organization"));
        Map<String, Object> faq = new LinkedHashMap<>();
        faq.put("@type", "FAQPage");
        faq.put("mainEntity", t.faq().stream().map(f -> Map.of("@type", "Question", "name", f.q(), "acceptedAnswer", Map.of("@type", "Answer", "text", f.a()))).toList());
        Map<String, Object> bc = Map.of("@type", "BreadcrumbList", "itemListElement", List.of(
                Map.of("@type", "ListItem", "position", 1, "name", "Accueil", "item", base + "/"),
                Map.of("@type", "ListItem", "position", 2, "name", ar ? "الأدوات" : "Outils", "item", base + "/outils"),
                Map.of("@type", "ListItem", "position", 3, "name", t.title(), "item", url)));
        return new Page(200, build(new Meta(t.metaTitle(), t.description(), url, "website", base + "/assets/icon-512.png", null, true, null, t.lang()), b.toString(), List.of(app, faq, bc)));
    }

    // ---------- Injection dans index.html ----------
    record Meta(String title, String description, String canonical, String type, String image, Instant modified, boolean index, String keywords, String lang) {}

    String build(Meta m, String bodyHtml, List<Map<String, Object>> jsonLd) { return build(m, bodyHtml, jsonLd, ""); }

    String build(Meta m, String bodyHtml, List<Map<String, Object>> jsonLd, String extraHead) {
        String t = template();
        StringBuilder h = new StringBuilder("\n");
        h.append("    <meta name=\"description\" content=\"").append(esc(m.description)).append("\" />\n");
        if (!blank(m.keywords)) h.append("    <meta name=\"keywords\" content=\"").append(esc(m.keywords)).append("\" />\n");
        h.append("    <meta name=\"robots\" content=\"").append(m.index ? "index, follow, max-image-preview:large, max-snippet:-1" : "noindex, follow").append("\" />\n");
        if (m.index) h.append("    <link rel=\"canonical\" href=\"").append(esc(m.canonical)).append("\" />\n");
        h.append("    <link rel=\"alternate\" type=\"application/rss+xml\" title=\"Blog Orgest\" href=\"/feed.xml\" />\n");
        h.append("    <meta property=\"og:site_name\" content=\"").append(BRAND).append("\" />\n    <meta property=\"og:locale\" content=\"" + ("ar".equals(m.lang) ? "ar_MA" : "fr_FR") + "\" />\n");
        h.append("    <meta property=\"og:type\" content=\"").append(m.type).append("\" />\n");
        h.append("    <meta property=\"og:title\" content=\"").append(esc(m.title)).append("\" />\n");
        h.append("    <meta property=\"og:description\" content=\"").append(esc(m.description)).append("\" />\n");
        h.append("    <meta property=\"og:url\" content=\"").append(esc(m.canonical)).append("\" />\n");
        if (m.image != null) h.append("    <meta property=\"og:image\" content=\"").append(esc(m.image)).append("\" />\n");
        if (m.modified != null) h.append("    <meta property=\"article:modified_time\" content=\"").append(m.modified).append("\" />\n");
        h.append("    <meta name=\"twitter:card\" content=\"").append(m.image != null && m.type.equals("article") ? "summary_large_image" : "summary").append("\" />\n");
        h.append("    <meta name=\"twitter:title\" content=\"").append(esc(m.title)).append("\" />\n");
        h.append("    <meta name=\"twitter:description\" content=\"").append(esc(m.description)).append("\" />\n");
        h.append(extraHead);
        if (!jsonLd.isEmpty()) {
            List<Map<String, Object>> graph = new ArrayList<>();
            for (Map<String, Object> o : jsonLd) graph.add(o);
            Map<String, Object> root = new LinkedHashMap<>();
            root.put("@context", "https://schema.org"); root.put("@graph", graph);
            h.append("    <script type=\"application/ld+json\">").append(jsonSafe(root)).append("</script>\n");
        }
        String out = ROBOTS_META.matcher(t).replaceAll("");
        boolean ar = "ar".equals(m.lang);
        out = HTML_TAG.matcher(out).replaceFirst(java.util.regex.Matcher.quoteReplacement("<html lang=\"" + (ar ? "ar" : "fr") + "\" dir=\"" + (ar ? "rtl" : "ltr") + "\">"));
        out = TITLE.matcher(out).replaceFirst(java.util.regex.Matcher.quoteReplacement("<title>" + esc(m.title) + "</title>"));
        int head = out.indexOf("</head>");
        if (head >= 0) out = out.substring(0, head) + h + "  " + out.substring(head);
        // Contenu lisible sans JavaScript, visuellement masqué ; React le remplace au montage.
        String style = "<style>.seo-static{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}</style>";
        int rootAt = out.indexOf("<div id=\"root\">");
        if (rootAt >= 0) {
            int close = out.indexOf("</div></div></div>", rootAt);
            // le splash se termine par trois </div> ; si le gabarit change, on ajoute simplement le contenu après l'ouverture de #root
            int insertAt = close >= 0 ? close + "</div></div></div>".length() : rootAt + "<div id=\"root\">".length();
            out = out.substring(0, insertAt) + style + bodyHtml + out.substring(insertAt);
        }
        return out;
    }

    private String jsonSafe(Object o) { return Json.write(o); }

    private String template() {
        long now = System.currentTimeMillis();
        String c = cachedTemplate;
        if (c != null && now - cachedAt < 60_000) return c;
        String t = null;
        try {
            if (!blank(indexFile) && Files.isReadable(Path.of(indexFile))) t = Files.readString(Path.of(indexFile), StandardCharsets.UTF_8);
            else if (!blank(indexUrl)) {
                HttpResponse<String> r = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build()
                        .send(HttpRequest.newBuilder(URI.create(indexUrl)).timeout(Duration.ofSeconds(3)).GET().build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                if (r.statusCode() == 200) t = r.body();
            }
        } catch (IOException | RuntimeException e) {
            // repli : gabarit minimal ci‑dessous
        } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        if (t == null || !t.contains("</head>")) t = c != null ? c : FALLBACK_TEMPLATE;
        cachedTemplate = t; cachedAt = now;
        return t;
    }

    // ---------- Fichiers pour robots / IA ----------
    public String robots(String base) {
        StringBuilder s = new StringBuilder("# robots.txt — généré par Orgest\nUser-agent: *\nAllow: /\nAllow: /api/public/blog-cover/\nDisallow: /app\nDisallow: /admin\nDisallow: /login\nDisallow: /api/\n\n");
        s.append("# Moteurs de réponse / IA : le contenu public est volontairement accessible (voir /llms.txt)\n");
        for (String bot : List.of("GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended"))
            s.append("User-agent: ").append(bot).append("\nAllow: /\nDisallow: /app\nDisallow: /admin\nDisallow: /login\nDisallow: /api/\n\n");
        s.append("Sitemap: ").append(base).append("/sitemap.xml\n");
        return s.toString();
    }

    public String llms(String base) {
        StringBuilder s = new StringBuilder("# ").append(BRAND).append("\n\n> ").append(HOME_DESC).append("\n\n")
          .append("Orgest est un logiciel SaaS marocain pour bijouteries : stock au gramme, ventes et reçus, échange d’or ancien, ventes à tempérament (paiement échelonné), atelier, rapports Excel. Interface en français et en arabe.\n\n## Pages\n\n")
          .append("- [Accueil](").append(base).append("/): présentation, fonctionnalités, tarifs, questions fréquentes\n")
          .append("- [Blog](").append(base).append("/blog): guides pratiques pour bijoutiers\n")
          .append("- [Outils gratuits](").append(base).append("/outils): calculateurs reprise d’or, carats, échéancier à tempérament\n")
          .append("- [Instagram](").append(INSTAGRAM).append("): conseils et nouveautés en images\n")
          .append("- [Flux RSS](").append(base).append("/feed.xml): nouveaux articles\n")
          .append("- [Texte complet des articles](").append(base).append("/llms-full.txt)\n\n## Articles\n\n");
        for (PostSummary p : content.publicPosts()) {
            s.append("- [").append(p.title()).append("](").append(base).append("/blog/").append(p.slug()).append(")");
            if (!blank(p.excerpt())) s.append(": ").append(p.excerpt().replace('\n', ' '));
            s.append('\n');
        }
        s.append("\n## Outils gratuits\n\n");
        for (ToolCatalog.Tool t : ToolCatalog.ALL) s.append("- [").append(t.title()).append("](").append(base).append("/outils/").append(t.slug()).append("): ").append(t.description()).append('\n');
        s.append("\n## Contact\n\n- WhatsApp : +").append(whatsapp).append("\n- Instagram : ").append(INSTAGRAM).append('\n');
        return s.toString();
    }

    public String llmsFull(String base) {
        StringBuilder s = new StringBuilder("# ").append(BRAND).append(" — contenu complet\n\n> ").append(HOME_DESC).append("\n\n## Questions fréquentes\n\n");
        for (Faq f : faq()) s.append("### ").append(f.q()).append("\n\n").append(f.a()).append("\n\n");
        s.append("## Articles\n\n");
        for (PostSummary ps : content.publicPosts()) {
            PostDto p = content.publicPost(ps.slug());
            s.append("---\n\n# ").append(p.title()).append("\n\nURL : ").append(base).append("/blog/").append(p.slug()).append("\n")
             .append("Mis à jour : ").append(DAY.format(p.updatedAt())).append("\n\n").append(MarkdownHtml.plain(p.content()).strip()).append("\n\n");
        }
        return s.toString();
    }

    public String sitemap(String base) {
        List<PostSummary> posts = content.publicPosts();
        String latest = posts.stream().map(PostSummary::updatedAt).max(Instant::compareTo).map(DAY::format).orElse(null);
        StringBuilder sb = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        url(sb, base + "/", latest, "weekly", "1.0");
        url(sb, base + "/blog", latest, "daily", "0.6");
        url(sb, base + "/blog/fr", latest, "daily", "0.8");
        url(sb, base + "/blog/ar", latest, "daily", "0.8");
        url(sb, base + "/outils", null, "monthly", "0.8");
        for (ToolCatalog.Tool t : ToolCatalog.ALL) url(sb, base + "/outils/" + t.slug(), null, "monthly", "0.8");
        for (PostSummary p : posts) url(sb, base + "/blog/" + p.slug(), DAY.format(p.updatedAt()), "monthly", "0.7");
        return sb.append("</urlset>\n").toString();
    }

    private static void url(StringBuilder sb, String loc, String lastmod, String freq, String prio) {
        sb.append("<url><loc>").append(esc(loc)).append("</loc>");
        if (lastmod != null) sb.append("<lastmod>").append(lastmod).append("</lastmod>");
        sb.append("<changefreq>").append(freq).append("</changefreq><priority>").append(prio).append("</priority></url>\n");
    }

    public String feed(String base) {
        List<PostSummary> posts = content.publicPosts();
        StringBuilder s = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<rss version=\"2.0\" xmlns:atom=\"http://www.w3.org/2005/Atom\"><channel>\n")
          .append("<title>").append(esc(BLOG_TITLE)).append("</title><link>").append(esc(base)).append("/blog</link><description>").append(esc(BLOG_DESC)).append("</description><language>fr</language>\n")
          .append("<atom:link href=\"").append(esc(base)).append("/feed.xml\" rel=\"self\" type=\"application/rss+xml\"/>\n");
        for (PostSummary p : posts) {
            String link = esc(base + "/blog/" + p.slug());
            s.append("<item><title>").append(esc(p.title())).append("</title><link>").append(link).append("</link><guid isPermaLink=\"true\">").append(link).append("</guid>")
             .append("<pubDate>").append(RFC822.format(p.publishedAt() != null ? p.publishedAt() : p.updatedAt())).append("</pubDate>");
            if (!blank(p.category())) s.append("<category>").append(esc(p.category())).append("</category>");
            s.append("<description>").append(esc(p.excerpt() == null ? "" : p.excerpt())).append("</description></item>\n");
        }
        return s.append("</channel></rss>\n").toString();
    }

    // ---------- utilitaires ----------
    private static String esc(String s) { return MarkdownHtml.escape(s); }
    private static boolean blank(String s) { return s == null || s.isBlank(); }
    static String snippet(String markdown, int max) {
        String t = MarkdownHtml.plain(markdown).replaceAll("\\s+", " ").strip();
        if (t.length() <= max) return t;
        int cut = t.lastIndexOf(' ', max - 1);
        return t.substring(0, cut > 40 ? cut : max - 1) + "…";
    }
}
