package com.orgest.security;

import com.orgest.repo.UserRepository;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtService jwt, UserRepository users) throws Exception {
        CookieCsrfTokenRepository csrfRepo = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfRepo.setCookieCustomizer(c -> c.sameSite("Strict"));

        http
            .cors(AbstractHttpConfigurer::disable)           // même origine uniquement (Nginx)
            .httpBasic(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .logout(AbstractHttpConfigurer::disable)
            .requestCache(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .csrf(c -> c.csrfTokenRepository(csrfRepo).csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
            .authorizeHttpRequests(a -> a
                .requestMatchers(HttpMethod.GET, "/api/auth/csrf").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/logout").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/public/**").permitAll()
                .requestMatchers("/api/auth/me").authenticated()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                // Réservé au commerçant (propriétaire) : prix, rapports/exports, stock (créer/modifier/supprimer), compte, équipe.
                .requestMatchers("/api/shop/team/**", "/api/shop/account/**", "/api/shop/reports", "/api/shop/dashboard",
                        "/api/shop/export/**").hasRole("SHOP")
                .requestMatchers(HttpMethod.PUT, "/api/shop/prices").hasRole("SHOP")
                .requestMatchers(HttpMethod.POST, "/api/shop/logo").hasRole("SHOP")
                .requestMatchers(HttpMethod.DELETE, "/api/shop/logo").hasRole("SHOP")
                .requestMatchers(HttpMethod.POST, "/api/shop/items", "/api/shop/items/*/photo").hasRole("SHOP")
                .requestMatchers(HttpMethod.PUT, "/api/shop/items/*").hasRole("SHOP")
                .requestMatchers(HttpMethod.DELETE, "/api/shop/items/*").hasRole("SHOP")
                .requestMatchers("/api/shop/**").hasAnyRole("SHOP", "STAFF")
                .anyRequest().denyAll())
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> json(res, 401, "UNAUTHENTICATED"))
                .accessDeniedHandler((req, res, ex) -> json(res, 403, "FORBIDDEN")))
            .addFilterBefore(new ApiGuardFilter(), UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(new SecurityHeadersFilter(), UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(new JwtAuthFilter(jwt, users), UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(new CsrfCookieFilter(), BasicAuthenticationFilter.class);
        return http.build();
    }

    private static void json(HttpServletResponse res, int status, String code) throws java.io.IOException {
        res.setStatus(status);
        res.setContentType("application/json");
        res.getWriter().write("{\"code\":\"" + code + "\"}");
    }
}
