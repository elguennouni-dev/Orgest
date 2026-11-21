package com.orgest.web;

import com.orgest.security.CurrentUser;
import com.orgest.service.CustomerService;
import com.orgest.web.Dtos.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shop/customers")
public class CustomerController {
    private final CustomerService customers;

    public CustomerController(CustomerService customers) { this.customers = customers; }

    @GetMapping
    public PageDto<CustomerDto> list(@RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "false") boolean debt,
                                     @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "30") int size) {
        return customers.list(CurrentUser.shopId(), q, debt, page, size);
    }

    @GetMapping("/{id}")
    public CustomerDetail detail(@PathVariable Long id) { return customers.detail(CurrentUser.shopId(), id); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerDto create(@Valid @RequestBody CustomerRequest r) { return customers.create(CurrentUser.shopId(), r); }

    @PutMapping("/{id}")
    public CustomerDto update(@PathVariable Long id, @Valid @RequestBody CustomerRequest r) { return customers.update(CurrentUser.shopId(), id, r); }

    @PostMapping("/{id}/payments")
    public CustomerDetail pay(@PathVariable Long id, @Valid @RequestBody CustomerPayRequest r) { return customers.pay(CurrentUser.shopId(), id, r); }
}
