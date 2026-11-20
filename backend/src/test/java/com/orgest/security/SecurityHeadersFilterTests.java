package com.orgest.security;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class SecurityHeadersFilterTests {
    private static String csp(String uri) throws Exception {
        MockHttpServletResponse res = new MockHttpServletResponse();
        new SecurityHeadersFilter().doFilter(new MockHttpServletRequest("GET", uri), res, new MockFilterChain());
        return res.getHeader("Content-Security-Policy");
    }

    @Test void apiJsonStaysLockedDown() throws Exception {
        assertEquals(SecurityHeadersFilter.API_CSP, csp("/api/public/posts"));
        assertTrue(csp("/api/auth/me").startsWith("default-src 'none'"));
    }

    @Test void seoHtmlPagesCanLoadTheirOwnAssets() throws Exception {
        for (String uri : new String[] {"/api/public/seo/home", "/api/public/seo/blog/abc", "/api/public/seo/tools/x"}) {
            String c = csp(uri);
            assertTrue(c.contains("script-src 'self'") && c.contains("style-src 'self' 'unsafe-inline'"), uri);
            assertFalse(c.contains("default-src 'none'"), uri);
            assertTrue(c.contains("frame-ancestors 'none'") && c.contains("object-src 'none'"), uri);
            assertFalse(c.contains("script-src 'self' 'unsafe-inline'"), "pas de scripts inline : " + uri);
        }
    }
}
