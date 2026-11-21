package com.orgest.web;

import com.orgest.security.CurrentUser;
import com.orgest.service.QuoteService;
import com.orgest.web.Dtos.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** Devis : ouverts au commerçant et à ses employés (comme les ventes). */
@RestController
@RequestMapping("/api/shop/quotes")
public class QuoteController {
    private final QuoteService quotes;

    public QuoteController(QuoteService quotes) { this.quotes = quotes; }

    private static Long me() { return CurrentUser.shopId(); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public QuoteDto create(@Valid @RequestBody QuoteRequest r) { return quotes.create(me(), r); }

    @GetMapping
    public PageDto<QuoteSummary> list(@RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "20") int size) {
        return quotes.list(me(), page, size);
    }

    @GetMapping("/{id}")
    public QuoteDto get(@PathVariable Long id) { return quotes.get(me(), id); }

    @PutMapping("/{id}")
    public QuoteDto update(@PathVariable Long id, @Valid @RequestBody QuoteRequest r) { return quotes.update(me(), id, r); }

    @PostMapping("/{id}/status")
    public QuoteDto status(@PathVariable Long id, @Valid @RequestBody QuoteStatusRequest r) {
        return quotes.setStatus(me(), id, r.status());
    }

    @PostMapping("/{id}/convert")
    @ResponseStatus(HttpStatus.CREATED)
    public SaleDto convert(@PathVariable Long id, @RequestBody(required = false) QuoteConvertRequest r) {
        return quotes.convert(me(), id, r);
    }
}
