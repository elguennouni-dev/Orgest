package com.orgest.service;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class PushServiceTests {
    @Test
    void onlyBrowserPushServicesAreAllowed() {
        assertTrue(PushService.allowedEndpoint("https://fcm.googleapis.com/fcm/send/abc"));
        assertTrue(PushService.allowedEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc"));
        assertTrue(PushService.allowedEndpoint("https://web.push.apple.com/abc"));
        assertTrue(PushService.allowedEndpoint("https://wns2-par02p.notify.windows.com/w/?token=x"));
        assertFalse(PushService.allowedEndpoint("http://fcm.googleapis.com/x"));          // pas de HTTP clair
        assertFalse(PushService.allowedEndpoint("https://127.0.0.1/x"));
        assertFalse(PushService.allowedEndpoint("https://localhost/x"));
        assertFalse(PushService.allowedEndpoint("https://evil.com/fcm.googleapis.com"));
        assertFalse(PushService.allowedEndpoint("https://fcm.googleapis.com.evil.com/x"));
        assertFalse(PushService.allowedEndpoint("https://user@fcm.googleapis.com/x"));
        assertFalse(PushService.allowedEndpoint("https://fcm.googleapis.com:8443/x"));
        assertFalse(PushService.allowedEndpoint("not a url"));
    }
}
