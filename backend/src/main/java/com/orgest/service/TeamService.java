package com.orgest.service;

import com.orgest.common.AppException;
import com.orgest.domain.AppUser;
import com.orgest.domain.Enums;
import com.orgest.repo.UserRepository;
import com.orgest.web.Dtos.StaffDto;
import com.orgest.web.Dtos.StaffRequest;
import com.orgest.web.Dtos.StaffUpdate;
import java.util.List;
import java.util.Locale;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Comptes employés d'un commerçant. Identifiant de connexion = « <commerçant>.<code> » : unique et lisible. */
@Service
public class TeamService {
    static final int MAX_STAFF = 10;
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final AuditService audit;

    public TeamService(UserRepository users, PasswordEncoder encoder, AuditService audit) {
        this.users = users;
        this.encoder = encoder;
        this.audit = audit;
    }

    static StaffDto toDto(AppUser u) {
        return new StaffDto(u.id, u.username, u.ownerName, u.active, u.createdAt);
    }

    @Transactional(readOnly = true)
    public List<StaffDto> list(Long shopId) {
        return users.findByOwnerIdOrderByCreatedAtAsc(shopId).stream().map(TeamService::toDto).toList();
    }

    @Transactional
    public StaffDto create(Long shopId, StaffRequest r) {
        AppUser owner = users.findById(shopId).orElseThrow(AppException::notFound);
        if (owner.role != Enums.Role.SHOP) throw AppException.notFound();
        if (users.countByOwnerId(shopId) >= MAX_STAFF) throw AppException.conflict("STAFF_LIMIT");
        String username = owner.username.toLowerCase(Locale.ROOT) + "." + r.code().toLowerCase(Locale.ROOT);
        if (users.findByUsernameIgnoreCase(username).isPresent()) throw AppException.conflict("USERNAME_TAKEN");
        PasswordPolicy.check(r.password(), username);
        AppUser u = new AppUser();
        u.username = username;
        u.passwordHash = encoder.encode(r.password());
        u.role = Enums.Role.STAFF;
        u.ownerId = shopId;
        u.ownerName = Text.clean(r.name(), 120);
        users.save(u);
        audit.log(shopId, owner.username, "STAFF_CREATE", username, null);
        return toDto(u);
    }

    @Transactional
    public StaffDto update(Long shopId, Long id, StaffUpdate r) {
        AppUser u = users.findByIdAndOwnerId(id, shopId).orElseThrow(AppException::notFound);
        if (r.name() != null) u.ownerName = Text.clean(r.name(), 120);
        if (r.password() != null && !r.password().isBlank()) {
            PasswordPolicy.check(r.password(), u.username);
            u.passwordHash = encoder.encode(r.password());
            u.tokenVersion++;          // déconnecte l'employé partout
            u.failedAttempts = 0;
            u.lockedUntil = null;
        }
        if (r.active() != null) {
            u.active = r.active();
            if (!u.active) u.tokenVersion++;
        }
        users.save(u);
        audit.log(shopId, null, "STAFF_UPDATE", u.username, null);
        return toDto(u);
    }

    @Transactional
    public void delete(Long shopId, Long id) {
        AppUser u = users.findByIdAndOwnerId(id, shopId).orElseThrow(AppException::notFound);
        users.delete(u);
        audit.log(shopId, null, "STAFF_DELETE", u.username, null);
    }
}
