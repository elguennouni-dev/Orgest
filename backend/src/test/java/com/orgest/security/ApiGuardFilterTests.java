package com.orgest.security;

import static org.junit.jupiter.api.Assertions.*;

import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class ApiGuardFilterTests {
    private final ApiGuardFilter filter = new ApiGuardFilter();

    private record Result(int status, boolean reached) {}

    private Result call(String path, String... headers) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", path);
        req.setRequestURI(path);
        for (int i = 0; i < headers.length; i += 2) req.addHeader(headers[i], headers[i + 1]);
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(req, res, chain);
        return new Result(res.getStatus(), chain.getRequest() != null);
    }

    @Test void typedUrlWithoutHeaderIs404() throws Exception {
        Result r = call("/api/public/posts");
        assertEquals(HttpServletResponse.SC_NOT_FOUND, r.status());
        assertFalse(r.reached());
    }

    @Test void typedUrlInBrowserIs404EvenIfHeaderIsForged() throws Exception {
        assertFalse(call("/api/public/posts", "X-Orgest-Client", "web", "Sec-Fetch-Site", "none", "Sec-Fetch-Mode", "navigate").reached());
    }

    @Test void crossSiteIs404() throws Exception {
        assertFalse(call("/api/shop/items", "X-Orgest-Client", "web", "Sec-Fetch-Site", "cross-site").reached());
        assertFalse(call("/api/shop/items", "X-Orgest-Client", "web", "Sec-Fetch-Site", "same-site").reached());
    }

    @Test void frontendFetchPasses() throws Exception {
        assertTrue(call("/api/shop/items", "X-Orgest-Client", "web", "Sec-Fetch-Site", "same-origin", "Sec-Fetch-Mode", "cors").reached());
    }

    @Test void wrongHeaderValueIs404() throws Exception {
        assertFalse(call("/api/auth/csrf", "X-Orgest-Client", "mobile").reached());
    }

    @Test void nonBrowserClientWithHeaderPasses() throws Exception {
        assertTrue(call("/api/auth/csrf", "X-Orgest-Client", "web").reached());
    }

    @Test void seoPagesAndCrawlerFilesStayPublic() throws Exception {
        for (String p : new String[] {"/api/public/seo/home", "/api/public/seo/blog/abc", "/api/public/robots.txt", "/api/public/llms.txt", "/api/public/llms-full.txt", "/api/public/sitemap.xml", "/api/public/feed.xml"})
            assertTrue(call(p, "Sec-Fetch-Site", "none").reached(), p);
    }

    @Test void imagesLoadFromPagesAndCrawlersButNotFromTheAddressBar() throws Exception {
        assertTrue(call("/api/public/blog-cover/x.jpg", "Sec-Fetch-Site", "same-origin", "Sec-Fetch-Dest", "image").reached());
        assertTrue(call("/api/shop/items/12/photo", "Sec-Fetch-Site", "same-origin", "Sec-Fetch-Dest", "image").reached());
        assertTrue(call("/api/public/blog-cover/x.jpg").reached(), "robots sans en-têtes Sec-Fetch");
        assertFalse(call("/api/shop/items/12/photo", "Sec-Fetch-Site", "none", "Sec-Fetch-Dest", "document").reached());
        assertFalse(call("/api/public/blog-cover/x.jpg", "Sec-Fetch-Site", "same-origin", "Sec-Fetch-Dest", "document").reached());
        assertFalse(call("/api/public/blog-cover/x.jpg", "Sec-Fetch-Site", "cross-site", "Sec-Fetch-Dest", "image").reached());
    }

    @Test void photoPatternDoesNotOpenOtherShopRoutes() throws Exception {
        assertFalse(call("/api/shop/items/12", "Sec-Fetch-Dest", "image").reached());
        assertFalse(call("/api/shop/items").reached());
    }

    @Test void pagesOutsideApiAreUntouched() throws Exception {
        assertTrue(call("/blog").reached());
    }
}
