package com.orgest.web;

import com.orgest.security.CurrentUser;
import com.orgest.service.TeamService;
import com.orgest.web.Dtos.StaffDto;
import com.orgest.web.Dtos.StaffRequest;
import com.orgest.web.Dtos.StaffUpdate;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** Gestion de l'équipe — réservé au commerçant (voir SecurityConfig : /api/shop/team/** = ROLE_SHOP). */
@RestController
@RequestMapping("/api/shop/team")
public class TeamController {
    private final TeamService team;

    public TeamController(TeamService team) { this.team = team; }

    @GetMapping
    public List<StaffDto> list() { return team.list(CurrentUser.shopId()); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StaffDto create(@Valid @RequestBody StaffRequest r) { return team.create(CurrentUser.shopId(), r); }

    @PutMapping("/{id}")
    public StaffDto update(@PathVariable Long id, @Valid @RequestBody StaffUpdate r) { return team.update(CurrentUser.shopId(), id, r); }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { team.delete(CurrentUser.shopId(), id); }
}
