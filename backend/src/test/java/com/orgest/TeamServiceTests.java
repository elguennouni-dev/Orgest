package com.orgest;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.orgest.common.AppException;
import com.orgest.domain.AppUser;
import com.orgest.domain.Enums;
import com.orgest.repo.UserRepository;
import com.orgest.service.AuditService;
import com.orgest.service.TeamService;
import com.orgest.web.Dtos.*;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

class TeamServiceTests {
    private static final long SHOP = 5L;
    private UserRepository users;
    private TeamService svc;
    private AppUser owner;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        PasswordEncoder enc = mock(PasswordEncoder.class);
        when(enc.encode(anyString())).thenAnswer(i -> "h:" + i.getArgument(0));
        owner = new AppUser();
        owner.id = SHOP; owner.username = "Bijoux"; owner.role = Enums.Role.SHOP;
        when(users.findById(SHOP)).thenReturn(Optional.of(owner));
        when(users.save(any(AppUser.class))).thenAnswer(i -> { AppUser u = i.getArgument(0); if (u.id == null) u.id = 99L; return u; });
        svc = new TeamService(users, enc, mock(AuditService.class));
    }

    @Test
    void createsStaffUnderOwnerWithPrefixedLogin() {
        StaffDto s = svc.create(SHOP, new StaffRequest("Sara", "Sara B.", "Secret123"));
        assertEquals("bijoux.sara", s.username());
        assertTrue(s.active());
        verify(users).save(argThat(u -> u.role == Enums.Role.STAFF && u.ownerId == SHOP && u.passwordHash.equals("h:Secret123")));
    }

    @Test
    void rejectsDuplicateLoginWeakPasswordAndLimit() {
        when(users.findByUsernameIgnoreCase("bijoux.sara")).thenReturn(Optional.of(new AppUser()));
        assertEquals("USERNAME_TAKEN", assertThrows(AppException.class, () -> svc.create(SHOP, new StaffRequest("sara", "S", "Secret123"))).code());
        assertEquals("WEAK_PASSWORD", assertThrows(AppException.class, () -> svc.create(SHOP, new StaffRequest("omar", "O", "short"))).code());
        when(users.countByOwnerId(SHOP)).thenReturn(10L);
        assertEquals("STAFF_LIMIT", assertThrows(AppException.class, () -> svc.create(SHOP, new StaffRequest("zed", "Z", "Secret123"))).code());
    }

    @Test
    void cannotTouchAnotherShopsStaff() {
        when(users.findByIdAndOwnerId(50L, SHOP)).thenReturn(Optional.empty());
        assertThrows(AppException.class, () -> svc.update(SHOP, 50L, new StaffUpdate(null, null, false)));
        assertThrows(AppException.class, () -> svc.delete(SHOP, 50L));
    }

    @Test
    void deactivateAndPasswordResetInvalidateSessions() {
        AppUser st = new AppUser();
        st.id = 8L; st.username = "bijoux.sara"; st.role = Enums.Role.STAFF; st.ownerId = SHOP; st.passwordHash = "x";
        when(users.findByIdAndOwnerId(8L, SHOP)).thenReturn(Optional.of(st));
        svc.update(SHOP, 8L, new StaffUpdate(null, "Newpass99", false));
        assertFalse(st.active);
        assertEquals(2, st.tokenVersion);
        assertEquals("h:Newpass99", st.passwordHash);
    }
}
