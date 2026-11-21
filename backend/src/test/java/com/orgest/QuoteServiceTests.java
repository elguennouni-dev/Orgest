package com.orgest;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.orgest.common.AppException;
import com.orgest.domain.Quote;
import com.orgest.repo.ItemRepository;
import com.orgest.repo.QuoteRepository;
import com.orgest.service.AuditService;
import com.orgest.service.CounterService;
import com.orgest.service.QuoteService;
import com.orgest.service.SalesService;
import com.orgest.web.Dtos.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class QuoteServiceTests {
    private static final long SHOP = 4L;
    private QuoteRepository quotes;
    private SalesService sales;
    private QuoteService svc;

    private static BigDecimal d(String s) { return new BigDecimal(s); }

    private static QuoteRequest req(String... prices) {
        List<LineIn> lines = new java.util.ArrayList<>();
        for (String p : prices) lines.add(new LineIn(null, "Bague", 18, d("2.500"), d(p), d("10"), 1));
        return new QuoteRequest("Amal", "0612345678", null, 10, lines);
    }

    @BeforeEach
    void setUp() {
        quotes = mock(QuoteRepository.class);
        sales = mock(SalesService.class);
        CounterService counters = mock(CounterService.class);
        when(counters.next(eq(SHOP), eq("QUOTE"), eq("D-"))).thenReturn("D-00001");
        when(quotes.save(any(Quote.class))).thenAnswer(i -> { Quote q = i.getArgument(0); q.id = 9L; return q; });
        svc = new QuoteService(quotes, mock(ItemRepository.class), counters, mock(AuditService.class), sales);
    }

    private Quote stored() {
        Quote q = new Quote();
        q.id = 9L; q.shopId = SHOP; q.number = "D-00001";
        q.validUntil = java.time.LocalDate.now().plusDays(5);
        return q;
    }

    @Test
    void createComputesTotalsAndNumber() {
        QuoteDto q = svc.create(SHOP, req("700", "800"));
        assertEquals("D-00001", q.number());
        assertEquals("DRAFT", q.status());
        // (2.5 * (700+10)) + (2.5 * (800+10)) = 1775 + 2025
        assertEquals(0, d("3800").compareTo(q.subtotal()));
        assertEquals(2, q.lines().size());
    }

    @Test
    void rejectsZeroPriceAndBadKarat() {
        assertThrows(AppException.class, () -> svc.create(SHOP, req("0")));
        QuoteRequest bad = new QuoteRequest(null, null, null, null,
                List.of(new LineIn(null, "X", 17, d("1"), d("500"), d("0"), 1)));
        assertThrows(AppException.class, () -> svc.create(SHOP, bad));
    }

    @Test
    void convertedQuoteCannotBeEditedOrConvertedAgain() {
        Quote q = stored();
        q.status = Quote.Status.CONVERTED;
        when(quotes.findByIdAndShopId(9L, SHOP)).thenReturn(Optional.of(q));
        assertThrows(AppException.class, () -> svc.convert(SHOP, 9L, null));
        assertThrows(AppException.class, () -> svc.update(SHOP, 9L, req("700")));
        assertThrows(AppException.class, () -> svc.setStatus(SHOP, 9L, "SENT"));
    }

    @Test
    void convertCreatesSaleAndMarksQuote() {
        Quote q = stored();
        com.orgest.domain.QuoteLine l = new com.orgest.domain.QuoteLine();
        l.quote = q; l.description = "Bague"; l.karat = 18; l.weightG = d("2.5"); l.quantity = 1;
        l.pricePerGram = d("700"); l.makingPerGram = d("10"); l.lineTotal = d("1775");
        q.lines.add(l);
        when(quotes.findByIdAndShopId(9L, SHOP)).thenReturn(Optional.of(q));
        SaleDto sale = new SaleDto(77L, "V-00001", "SALE", "Amal", null, d("1775"), BigDecimal.ZERO, d("1775"),
                "CASH", BigDecimal.ZERO, 0, "CASH", BigDecimal.ZERO, null, null, List.of(), List.of(), null);
        when(sales.createSale(eq(SHOP), any(SaleRequest.class))).thenReturn(sale);
        SaleDto out = svc.convert(SHOP, 9L, null);
        assertEquals(77L, out.id());
        assertEquals(Quote.Status.CONVERTED, q.status);
        assertEquals(77L, q.saleId);
    }

    @Test
    void manualStatusRejectsConvertedAndDraft() {
        Quote q = stored();
        when(quotes.findByIdAndShopId(9L, SHOP)).thenReturn(Optional.of(q));
        assertThrows(AppException.class, () -> svc.setStatus(SHOP, 9L, "CONVERTED"));
        assertThrows(AppException.class, () -> svc.setStatus(SHOP, 9L, "nope"));
        assertEquals("ACCEPTED", svc.setStatus(SHOP, 9L, "ACCEPTED").status());
    }
}
