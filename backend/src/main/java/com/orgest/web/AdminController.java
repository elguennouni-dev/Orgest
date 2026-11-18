package com.orgest.web;

import com.orgest.security.CurrentUser;
import com.orgest.service.AdminService;
import com.orgest.service.ShopService;
import com.orgest.web.Dtos.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminService svc;
    private final ShopService shop;
    private final AuthController auth;
    private final com.orgest.security.JwtService jwt;

    public AdminController(AdminService svc, ShopService shop, AuthController auth, com.orgest.security.JwtService jwt) {
        this.svc = svc;
        this.shop = shop;
        this.auth = auth;
        this.jwt = jwt;
    }

    @PostMapping("/password")
    public void password(@Valid @RequestBody ChangePasswordRequest r, HttpServletRequest req,
                         jakarta.servlet.http.HttpServletResponse res) {
        var u = shop.changePassword(CurrentUser.get().id(), r, req.getRemoteAddr());
        auth.setCookie(res, jwt.issue(u), jwt.ttl());
    }

    @GetMapping("/stats")
    public AdminStats stats() { return svc.stats(); }

    @GetMapping("/shops")
    public List<ShopSummary> list() { return svc.list(); }

    @PostMapping("/shops")
    @ResponseStatus(HttpStatus.CREATED)
    public CredentialsResponse create(@Valid @RequestBody CreateShopRequest r, HttpServletRequest req) {
        var me = CurrentUser.get();
        return svc.create(r, me.id(), me.username(), req.getRemoteAddr());
    }

    @GetMapping("/shops/{id}")
    public ShopDetail detail(@PathVariable Long id) { return svc.detail(id); }

    @PutMapping("/shops/{id}")
    public ShopDetail update(@PathVariable Long id, @Valid @RequestBody UpdateShopRequest r, HttpServletRequest req) {
        var me = CurrentUser.get();
        return svc.update(id, r, me.id(), me.username(), req.getRemoteAddr());
    }

    @PostMapping("/shops/{id}/renew")
    public ShopDetail renew(@PathVariable Long id, @Valid @RequestBody RenewRequest r, HttpServletRequest req) {
        var me = CurrentUser.get();
        return svc.renew(id, r, me.id(), me.username(), req.getRemoteAddr());
    }

    @PostMapping("/shops/{id}/suspend")
    public ShopDetail suspend(@PathVariable Long id, HttpServletRequest req) {
        var me = CurrentUser.get();
        return svc.setActive(id, false, me.id(), me.username(), req.getRemoteAddr());
    }

    @PostMapping("/shops/{id}/activate")
    public ShopDetail activate(@PathVariable Long id, HttpServletRequest req) {
        var me = CurrentUser.get();
        return svc.setActive(id, true, me.id(), me.username(), req.getRemoteAddr());
    }

    @PostMapping("/shops/{id}/reset-password")
    public CredentialsResponse reset(@PathVariable Long id, HttpServletRequest req) {
        var me = CurrentUser.get();
        return svc.resetPassword(id, me.id(), me.username(), req.getRemoteAddr());
    }
}
