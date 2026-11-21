package com.orgest.web;

import com.orgest.security.CurrentUser;
import com.orgest.service.PushService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** Notifications push — réservé au commerçant (voir SecurityConfig : /api/shop/push/** = ROLE_SHOP). */
@RestController
@RequestMapping("/api/shop/push")
public class PushController {
    private final PushService push;

    public PushController(PushService push) { this.push = push; }

    public record Keys(@NotBlank @Size(max = 120) String p256dh, @NotBlank @Size(max = 40) String auth) {}
    public record SubscribeRequest(@NotBlank @Size(max = 700) String endpoint, @Valid Keys keys) {}
    public record UnsubscribeRequest(@NotBlank @Size(max = 700) String endpoint) {}

    @GetMapping("/key")
    public Map<String, Object> key() {
        return Map.of("publicKey", push.publicKey(), "subscriptions", push.count(CurrentUser.shopId()));
    }

    @PostMapping("/subscribe")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void subscribe(@Valid @RequestBody SubscribeRequest r) {
        if (r.keys() == null) throw com.orgest.common.AppException.bad("INVALID_PUSH_KEYS");
        push.subscribe(CurrentUser.shopId(), r.endpoint(), r.keys().p256dh(), r.keys().auth());
    }

    @PostMapping("/unsubscribe")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsubscribe(@Valid @RequestBody UnsubscribeRequest r) { push.unsubscribe(CurrentUser.shopId(), r.endpoint()); }

    @PostMapping("/test")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void test() { push.sendTest(CurrentUser.shopId()); }
}
