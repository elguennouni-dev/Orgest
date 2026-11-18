package com.orgest.service;

import com.orgest.common.Text;
import com.orgest.domain.AuditLog;
import com.orgest.repo.AuditRepository;
import org.springframework.stereotype.Service;

/** Journal d'audit (OWASP A09) : connexions, échecs, actions d'administration, changements de mot de passe. */
@Service
public class AuditService {
    private final AuditRepository repo;

    public AuditService(AuditRepository repo) { this.repo = repo; }

    public void log(Long userId, String username, String action, String detail, String ip) {
        AuditLog a = new AuditLog();
        a.userId = userId;
        a.username = Text.clean(username, 60);
        a.action = action;
        a.detail = Text.clean(detail, 500);
        a.ip = Text.clean(ip, 45);
        repo.save(a);
    }
}
