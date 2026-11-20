package com.orgest.common;

import static org.junit.jupiter.api.Assertions.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class JsonTests {
    @Test void writesNestedStructures() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("a", 1); m.put("b", true); m.put("c", List.of("x", "y")); m.put("d", Map.of("k", "v")); m.put("e", null);
        assertEquals("{\"a\":1,\"b\":true,\"c\":[\"x\",\"y\"],\"d\":{\"k\":\"v\"},\"e\":null}", Json.write(m));
    }

    @Test void escapesQuotesBackslashesAndControlChars() {
        assertEquals("\"a\\\"b\\\\c\\nd\"", Json.write("a\"b\\c\nd"));
    }

    @Test void neverEmitsAngleBracketsOrAmpersands() {
        String j = Json.write("</script><b>&");
        assertFalse(j.contains("<") || j.contains(">") || j.contains("&"));
        assertEquals("\"\\u003c/script\\u003e\\u003cb\\u003e\\u0026\"", j);
    }

    @Test void keepsArabicAndAccents() {
        assertEquals("\"عيار 18 é\"", Json.write("عيار 18 é"));
    }
}
