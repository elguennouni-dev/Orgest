package com.orgest.repo;

import com.orgest.domain.AppUser;
import com.orgest.domain.Enums;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByUsernameIgnoreCase(String username);
    boolean existsByUsernameIgnoreCase(String username);
    boolean existsByRole(Enums.Role role);
    List<AppUser> findByRoleOrderByCreatedAtDesc(Enums.Role role);
    List<AppUser> findByOwnerIdOrderByCreatedAtAsc(Long ownerId);
    Optional<AppUser> findByIdAndOwnerId(Long id, Long ownerId);
    long countByOwnerId(Long ownerId);
    Optional<AppUser> findByIdAndRole(Long id, Enums.Role role);
}
