package com.orgest;

import static org.junit.jupiter.api.Assertions.*;

import com.orgest.common.AppException;
import com.orgest.service.PasswordPolicy;
import org.junit.jupiter.api.Test;

class PolicyTests {
    @Test
    void generatedPasswordsAreAccepted() {
        for (int i = 0; i < 200; i++) PasswordPolicy.check(PasswordPolicy.generate(), "shop");
    }

    @Test
    void weakPasswordsAreRejected() {
        assertThrows(AppException.class, () -> PasswordPolicy.check("short1", "u"));
        assertThrows(AppException.class, () -> PasswordPolicy.check("onlyletters", "u"));
        assertThrows(AppException.class, () -> PasswordPolicy.check("12345678", "u"));
        assertThrows(AppException.class, () -> PasswordPolicy.check("username1", "username1"));
    }
}
