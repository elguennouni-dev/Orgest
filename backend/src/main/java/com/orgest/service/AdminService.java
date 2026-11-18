package com.orgest.service;

import com.orgest.common.AppException;
import com.orgest.common.Money;
import com.orgest.common.Text;
import com.orgest.domain.AppUser;
import com.orgest.domain.Enums;
import com.orgest.domain.Payment;
import com.orgest.repo.PaymentRepository;
import com.orgest.repo.UserRepository;
import com.orgest.web.Dtos.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {
    private final UserRepository users;
    private final PaymentRepository payments;
    private final PasswordEncoder encoder;
    private final AuditService audit;

    public AdminService(UserRepository users, PaymentRepository payments, PasswordEncoder encoder, AuditService audit) {
        this.users = users;
        this.payments = payments;
        this.encoder = encoder;
        this.audit = audit;
    }

    public static ShopSummary summary(AppUser u) {
        LocalDate today = Money.today();
        long days = u.subscriptionEnd == null ? 0 : ChronoUnit.DAYS.between(today, u.subscriptionEnd);
        String status;
        if (!u.active) status = "SUSPENDED";
        else if (u.subscriptionEnd == null || u.subscriptionEnd.isBefore(today)) status = "EXPIRED";
        else if (days <= 7) status = "EXPIRING";
        else status = "ACTIVE";
        return new ShopSummary(u.id, u.username, u.shopName, u.ownerName, u.phone, u.city, u.active,
                u.subscriptionEnd, status, days, u.createdAt);
    }

    static PaymentDto toDto(Payment p) {
        return new PaymentDto(p.id, p.amount, p.method.name(), p.months, p.reference, p.note, p.periodStart,
                p.periodEnd, p.paidAt);
    }

    private AppUser shop(Long id) {
        return users.findByIdAndRole(id, Enums.Role.SHOP).orElseThrow(AppException::notFound);
    }

    @Transactional(readOnly = true)
    public List<ShopSummary> list() {
        return users.findByRoleOrderByCreatedAtDesc(Enums.Role.SHOP).stream().map(AdminService::summary).toList();
    }

    @Transactional(readOnly = true)
    public AdminStats stats() {
        long active = 0, expiring = 0, expired = 0, suspended = 0;
        for (ShopSummary s : list()) {
            switch (s.status()) {
                case "ACTIVE" -> active++;
                case "EXPIRING" -> { active++; expiring++; }
                case "EXPIRED" -> expired++;
                default -> suspended++;
            }
        }
        LocalDate first = Money.today().withDayOfMonth(1);
        BigDecimal revenue = payments.revenueSince(Money.startOf(first));
        return new AdminStats(active, expiring, expired, suspended, revenue);
    }

    @Transactional(readOnly = true)
    public ShopDetail detail(Long id) {
        AppUser u = shop(id);
        return new ShopDetail(summary(u), payments.findByShopIdOrderByPaidAtDesc(id).stream().map(AdminService::toDto).toList());
    }

    @Transactional
    public CredentialsResponse create(CreateShopRequest r, Long adminId, String adminName, String ip) {
        if (users.existsByUsernameIgnoreCase(r.username())) throw AppException.conflict("USERNAME_TAKEN");
        String password = Text.blankToNull(r.password()) == null ? PasswordPolicy.generate() : r.password();
        PasswordPolicy.check(password, r.username());

        AppUser u = new AppUser();
        u.username = r.username();
        u.passwordHash = encoder.encode(password);
        u.role = Enums.Role.SHOP;
        u.shopName = r.shopName().trim();
        u.ownerName = Text.blankToNull(r.ownerName());
        u.phone = Text.blankToNull(r.phone());
        u.city = Text.blankToNull(r.city());
        u.active = true;
        LocalDate start = Money.today();
        u.subscriptionEnd = start.plusMonths(r.months());
        users.save(u);
        recordPayment(u, r.months(), r.method(), r.amount(), r.reference(), null, start, u.subscriptionEnd);
        audit.log(adminId, adminName, "SHOP_CREATE", "shop=" + u.id + " user=" + u.username, ip);
        return new CredentialsResponse(u.id, u.username, password);
    }

    @Transactional
    public ShopDetail renew(Long id, RenewRequest r, Long adminId, String adminName, String ip) {
        AppUser u = shop(id);
        LocalDate today = Money.today();
        LocalDate start = (u.subscriptionEnd != null && u.subscriptionEnd.isAfter(today)) ? u.subscriptionEnd : today;
        u.subscriptionEnd = start.plusMonths(r.months());
        u.active = true;
        users.save(u);
        recordPayment(u, r.months(), r.method(), r.amount(), r.reference(), r.note(), start, u.subscriptionEnd);
        audit.log(adminId, adminName, "SHOP_RENEW", "shop=" + id + " months=" + r.months(), ip);
        return detail(id);
    }

    @Transactional
    public ShopDetail setActive(Long id, boolean active, Long adminId, String adminName, String ip) {
        AppUser u = shop(id);
        u.active = active;
        if (!active) u.tokenVersion++;   // invalide les sessions en cours
        users.save(u);
        audit.log(adminId, adminName, active ? "SHOP_ACTIVATE" : "SHOP_SUSPEND", "shop=" + id, ip);
        return detail(id);
    }

    @Transactional
    public ShopDetail update(Long id, UpdateShopRequest r, Long adminId, String adminName, String ip) {
        AppUser u = shop(id);
        u.shopName = r.shopName().trim();
        u.ownerName = Text.blankToNull(r.ownerName());
        u.phone = Text.blankToNull(r.phone());
        u.city = Text.blankToNull(r.city());
        users.save(u);
        audit.log(adminId, adminName, "SHOP_UPDATE", "shop=" + id, ip);
        return detail(id);
    }

    @Transactional
    public CredentialsResponse resetPassword(Long id, Long adminId, String adminName, String ip) {
        AppUser u = shop(id);
        String password = PasswordPolicy.generate();
        u.passwordHash = encoder.encode(password);
        u.tokenVersion++;
        u.failedAttempts = 0;
        u.lockedUntil = null;
        users.save(u);
        audit.log(adminId, adminName, "SHOP_RESET_PASSWORD", "shop=" + id, ip);
        return new CredentialsResponse(u.id, u.username, password);
    }

    private void recordPayment(AppUser u, int months, Enums.PayMethod method, BigDecimal amount, String ref,
                               String note, LocalDate start, LocalDate end) {
        Payment p = new Payment();
        p.shopId = u.id;
        p.months = months;
        p.method = method;
        p.amount = Money.round2(amount);
        p.reference = Text.blankToNull(Text.clean(ref, 80));
        p.note = Text.blankToNull(Text.clean(note, 255));
        p.periodStart = start;
        p.periodEnd = end;
        payments.save(p);
    }
}
