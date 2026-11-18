package com.orgest.service;

import com.orgest.config.OrgestProperties;
import com.orgest.domain.AppUser;
import com.orgest.domain.Enums;
import com.orgest.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Crée le premier compte admin à partir des variables d'environnement (aucun mot de passe par défaut dans le code). */
@Component
public class AdminBootstrap implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final OrgestProperties props;

    public AdminBootstrap(UserRepository users, PasswordEncoder encoder, OrgestProperties props) {
        this.users = users;
        this.encoder = encoder;
        this.props = props;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (users.existsByRole(Enums.Role.ADMIN)) return;
        String pw = props.adminPassword();
        if (pw == null || pw.length() < 12) {
            log.warn("Aucun admin et ORGEST_ADMIN_PASSWORD absent ou trop court (< 12) : admin NON créé.");
            return;
        }
        AppUser a = new AppUser();
        a.username = props.adminUsername();
        a.passwordHash = encoder.encode(pw);
        a.role = Enums.Role.ADMIN;
        a.shopName = "Orgest Admin";
        users.save(a);
        log.info("Compte admin '{}' créé.", a.username);
    }
}
