package com.orgest.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.orgest.common.AppException;
import com.orgest.domain.Enums;
import com.orgest.domain.Sale;
import com.orgest.repo.*;
import com.orgest.web.Dtos.ReportDto;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ReportServiceTests {
    private SaleRepository sales;
    private BuybackRepository buybacks;
    private ReportService svc;

    private static BigDecimal d(String s) { return new BigDecimal(s); }

    @BeforeEach
    void setUp() {
        sales = mock(SaleRepository.class);
        buybacks = mock(BuybackRepository.class);
        svc = new ReportService(sales, buybacks, mock(ItemRepository.class), mock(InstallmentRepository.class),
                mock(WorkshopRepository.class), mock(ShopService.class));
        when(buybacks.totalBetween(anyLong(), any(), any())).thenReturn(BigDecimal.ZERO);
        when(buybacks.weightBetween(anyLong(), any(), any())).thenReturn(BigDecimal.ZERO);
        when(sales.exchangesBetween(anyLong(), any(), any(), any())).thenReturn(0L);
    }

    private static Sale sale(String subtotal, Instant at) {
        Sale s = new Sale();
        s.subtotal = d(subtotal); s.createdAt = at; s.type = Enums.SaleType.SALE;
        return s;
    }

    @Test
    void formulaInjectionIsNeutralised() {
        assertEquals("'=SUM(A1)", ReportService.safe("=SUM(A1)"));
        assertEquals("'+1", ReportService.safe("+1"));
        assertEquals("'-1", ReportService.safe("-1"));
        assertEquals("'@x", ReportService.safe("@x"));
        assertEquals("Fatima", ReportService.safe("Fatima"));
        assertEquals("", ReportService.safe(null));
    }

    @Test
    void rangeIsValidated() {
        LocalDate a = LocalDate.of(2026, 1, 10);
        for (LocalDate[] r : new LocalDate[][]{{a, a.minusDays(1)}, {a, a.plusDays(400)}, {null, a}, {a, null}}) {
            assertEquals("INVALID_RANGE", assertThrows(AppException.class, () -> svc.report(1L, r[0], r[1])).code());
        }
        assertDoesNotThrow(() -> svc.report(1L, a, a));
        assertDoesNotThrow(() -> svc.report(1L, a, a.plusDays(366)));
    }

    @Test
    void reportSumsAveragesAndFillsEmptyDays() {
        LocalDate from = LocalDate.of(2026, 3, 1), to = LocalDate.of(2026, 3, 3);
        Instant d1 = from.atTime(10, 0).atZone(com.orgest.common.Money.ZONE).toInstant();
        Instant d3 = to.atTime(15, 0).atZone(com.orgest.common.Money.ZONE).toInstant();
        when(sales.between(eq(1L), any(), any())).thenReturn(List.of(sale("1000.00", d1), sale("500.01", d1), sale("250.00", d3)));
        ReportDto r = svc.report(1L, from, to);
        assertEquals(3, r.salesCount());
        assertEquals(d("1750.01"), r.salesTotal());
        assertEquals(d("583.34"), r.averageTicket());
        assertEquals(3, r.byDay().size());
        assertEquals(d("1500.01"), r.byDay().get(0).total());
        assertEquals(0, r.byDay().get(1).total().compareTo(BigDecimal.ZERO));
        assertEquals(d("250.00"), r.byDay().get(2).total());
    }

    @Test
    void emptyPeriodHasZeroAverage() {
        when(sales.between(anyLong(), any(), any())).thenReturn(List.of());
        ReportDto r = svc.report(1L, LocalDate.of(2026, 3, 1), LocalDate.of(2026, 3, 1));
        assertEquals(0, r.salesCount());
        assertEquals(0, r.averageTicket().compareTo(BigDecimal.ZERO));
    }
}
