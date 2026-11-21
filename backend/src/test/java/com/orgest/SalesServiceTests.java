package com.orgest;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.orgest.common.AppException;
import com.orgest.domain.*;
import com.orgest.repo.*;
import com.orgest.service.AuditService;
import com.orgest.service.CounterService;
import com.orgest.service.SalesService;
import com.orgest.web.Dtos.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Scénarios de vente / échange / à tempérament, repositories simulés (pas de base de données). */
class SalesServiceTests {
    private static final long SHOP = 7L;
    private SaleRepository sales;
    private BuybackRepository buybacks;
    private InstallmentRepository installments;
    private ItemRepository items;
    private SalesService svc;
    private final List<Installment> saved = new ArrayList<>();
    private long seq = 100;

    private static BigDecimal d(String s) { return new BigDecimal(s); }

    @BeforeEach
    void setUp() {
        sales = mock(SaleRepository.class);
        buybacks = mock(BuybackRepository.class);
        installments = mock(InstallmentRepository.class);
        items = mock(ItemRepository.class);
        CounterService counters = mock(CounterService.class);
        when(counters.next(anyLong(), anyString(), anyString())).thenAnswer(i -> i.getArgument(2) + "0001");
        when(sales.save(any(Sale.class))).thenAnswer(i -> { Sale s = i.getArgument(0); s.id = ++seq; return s; });
        when(buybacks.save(any(Buyback.class))).thenAnswer(i -> { Buyback b = i.getArgument(0); b.id = ++seq; return b; });
        when(installments.saveAll(anyIterable())).thenAnswer(i -> {
            Iterable<Installment> it = i.getArgument(0);
            it.forEach(saved::add);
            return saved;
        });
        svc = new SalesService(sales, buybacks, installments, items, counters, mock(AuditService.class), mock(com.orgest.service.CustomerService.class));
    }

    private Item stockItem(long id, int karat, String weight) {
        Item it = new Item();
        it.id = id; it.shopId = SHOP; it.ref = "A-" + id; it.name = "Bague " + id; it.category = "ring";
        it.karat = karat; it.weightG = d(weight); it.status = Enums.ItemStatus.IN_STOCK;
        return it;
    }

    private void stock(Item... its) {
        when(items.findByShopIdAndIdIn(eq(SHOP), anyCollection())).thenReturn(List.of(its));
    }

    private static LineIn item(long id, String price, String making) {
        return new LineIn(id, null, null, null, d(price), d(making), null);
    }

    private static LineIn itemQty(long id, String price, String making, int qty) {
        return new LineIn(id, null, null, null, d(price), d(making), qty);
    }

    private static BuybackRequest oldGold(int karat, String gross, String ded, String price) {
        return new BuybackRequest(null, null, null, null, karat, d(gross), d(ded), d(price));
    }

    private static SaleRequest req(Enums.SaleType type, String customer, List<LineIn> lines, BuybackRequest old,
                                   Enums.PaymentMode mode, String down, Integer months) {
        return new SaleRequest(type, customer, "0600000000", lines, old, mode, down == null ? null : d(down), months, null);
    }

    @Test
    void cashSaleComputesTotals() {
        Item it = stockItem(1, 18, "10.000");
        stock(it);
        SaleDto s = svc.createSale(SHOP, req(Enums.SaleType.SALE, null, List.of(item(1, "640", "100")), null,
                Enums.PaymentMode.CASH, null, null));
        assertEquals(d("7400.00"), s.subtotal());
        assertEquals(0, s.tradeInAmount().compareTo(BigDecimal.ZERO));
        assertEquals(d("7400.00"), s.balance());
        assertEquals("CASH", s.paymentMode());
        assertEquals(d("7400.00"), s.downPayment());
        assertTrue(s.installments().isEmpty());
        assertEquals(Enums.ItemStatus.SOLD, it.status);
    }

    @Test
    void payMethodDefaultsToCashAndKeepsChoice() {
        stock(stockItem(1, 18, "10.000"));
        SaleDto a = svc.createSale(SHOP, req(Enums.SaleType.SALE, null, List.of(item(1, "640", "100")), null,
                Enums.PaymentMode.CASH, null, null));
        assertEquals("CASH", a.payMethod());
        stock(stockItem(2, 18, "10.000"));
        SaleDto b = svc.createSale(SHOP, new SaleRequest(Enums.SaleType.SALE, null, "0600000000",
                List.of(item(2, "640", "100")), null, Enums.PaymentMode.CASH, null, null, Enums.SalePay.CHEQUE));
        assertEquals("CHEQUE", b.payMethod());
    }

    @Test
    void creditSaleKeepsRemainderDueAndRequiresCustomer() {
        stock(stockItem(1, 18, "10.000"));
        SaleDto s = svc.createSale(SHOP, new SaleRequest(Enums.SaleType.SALE, "Ali", "0600000000",
                List.of(item(1, "640", "100")), null, Enums.PaymentMode.CASH, d("1000"), null, Enums.SalePay.CREDIT));
        assertEquals("CREDIT", s.payMethod());
        assertEquals(d("1000.00"), s.downPayment());
        assertEquals(d("6400.00"), s.creditDue());
        stock(stockItem(2, 18, "10.000"));
        assertEquals("CUSTOMER_REQUIRED", assertThrows(AppException.class, () -> svc.createSale(SHOP, new SaleRequest(Enums.SaleType.SALE, null, null,
                List.of(item(2, "640", "100")), null, Enums.PaymentMode.CASH, null, null, Enums.SalePay.CREDIT))).code());
        assertEquals("DOWN_TOO_HIGH", assertThrows(AppException.class, () -> svc.createSale(SHOP, new SaleRequest(Enums.SaleType.SALE, "Ali", null,
                List.of(item(2, "640", "100")), null, Enums.PaymentMode.CASH, d("7400"), null, Enums.SalePay.CREDIT))).code());
    }

    @Test
    void exchangeSubtractsTradeInAndFreezesWeights() {
        stock(stockItem(1, 18, "10.000"));
        SaleDto s = svc.createSale(SHOP, req(Enums.SaleType.EXCHANGE, "Fatima", List.of(item(1, "640", "100")),
                oldGold(18, "5", "10", "560"), Enums.PaymentMode.CASH, null, null));
        assertEquals(d("7400.00"), s.subtotal());
        assertEquals(d("2520.00"), s.tradeInAmount()); // 5 g − 10 % = 4,5 g × 560
        assertEquals(d("4880.00"), s.balance());
        assertEquals(d("4.500"), s.buyback().netWeightG());
    }

    @Test
    void exchangeWithoutOldGoldIsRejected() {
        stock(stockItem(1, 18, "10.000"));
        AppException e = assertThrows(AppException.class, () -> svc.createSale(SHOP,
                req(Enums.SaleType.EXCHANGE, "F", List.of(item(1, "640", "100")), null, Enums.PaymentMode.CASH, null, null)));
        assertEquals("OLD_GOLD_REQUIRED", e.code());
    }

    @Test
    void oldGoldWorthMoreThanPurchaseGivesRefund() {
        stock(stockItem(1, 18, "1.000"));
        SaleDto s = svc.createSale(SHOP, req(Enums.SaleType.EXCHANGE, "F", List.of(item(1, "640", "0")),
                oldGold(18, "10", "0", "560"), Enums.PaymentMode.CASH, null, null));
        assertEquals(d("-4960.00"), s.balance());
        assertEquals(0, s.downPayment().compareTo(BigDecimal.ZERO));
    }

    @Test
    void installmentBuildsExactScheduleAfterTradeIn() {
        stock(stockItem(1, 21, "20.000"));
        SaleDto s = svc.createSale(SHOP, req(Enums.SaleType.EXCHANGE, "Fatima", List.of(item(1, "747", "100")),
                oldGold(18, "10", "0", "560"), Enums.PaymentMode.INSTALLMENT, "2000", 3));
        assertEquals(d("16940.00"), s.subtotal());
        assertEquals(d("5600.00"), s.tradeInAmount());
        assertEquals(d("11340.00"), s.balance());
        assertEquals(d("2000.00"), s.downPayment());
        assertEquals(3, s.months());
        assertEquals(3, saved.size());
        BigDecimal total = saved.stream().map(i -> i.amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(d("9340.00"), total);
        assertEquals(d("3113.34"), saved.get(0).amount);
        assertEquals(d("3113.33"), saved.get(2).amount);
        assertTrue(saved.stream().allMatch(i -> i.saleId != null && !i.paid));
    }

    @Test
    void installmentRequiresCustomer() {
        stock(stockItem(1, 18, "10.000"));
        AppException e = assertThrows(AppException.class, () -> svc.createSale(SHOP, req(Enums.SaleType.SALE, "  ",
                List.of(item(1, "640", "0")), null, Enums.PaymentMode.INSTALLMENT, "0", 6)));
        assertEquals("CUSTOMER_REQUIRED", e.code());
        verify(installments, never()).saveAll(anyIterable());
    }

    @Test
    void installmentRejectsDownPaymentCoveringBalance() {
        stock(stockItem(1, 18, "10.000"));
        AppException e = assertThrows(AppException.class, () -> svc.createSale(SHOP, req(Enums.SaleType.SALE, "F",
                List.of(item(1, "640", "0")), null, Enums.PaymentMode.INSTALLMENT, "6400", 6)));
        assertEquals("DOWN_TOO_HIGH", e.code());
    }

    @Test
    void installmentRejectsNegativeBalance() {
        stock(stockItem(1, 18, "1.000"));
        AppException e = assertThrows(AppException.class, () -> svc.createSale(SHOP, req(Enums.SaleType.EXCHANGE, "F",
                List.of(item(1, "640", "0")), oldGold(18, "10", "0", "560"), Enums.PaymentMode.INSTALLMENT, "0", 6)));
        assertEquals("NO_BALANCE", e.code());
    }

    @Test
    void installmentRejectsBadMonths() {
        for (Integer m : new Integer[]{null, 0, 37}) {
            stock(stockItem(1, 18, "10.000")); // article neuf à chaque tour (createSale le marque vendu en mémoire)
            AppException e = assertThrows(AppException.class, () -> svc.createSale(SHOP, req(Enums.SaleType.SALE, "F",
                    List.of(item(1, "640", "0")), null, Enums.PaymentMode.INSTALLMENT, "0", m)));
            assertEquals("INVALID_MONTHS", e.code());
        }
    }

    @Test
    void soldItemCannotBeSoldAgain() {
        Item it = stockItem(1, 18, "10.000");
        it.status = Enums.ItemStatus.SOLD;
        it.quantity = 0;
        stock(it);
        AppException e = assertThrows(AppException.class, () -> svc.createSale(SHOP,
                req(Enums.SaleType.SALE, null, List.of(item(1, "640", "0")), null, Enums.PaymentMode.CASH, null, null)));
        assertEquals("ITEM_NOT_IN_STOCK", e.code());
    }

    @Test
    void sellingPartOfTheQuantityKeepsTheItemInStock() {
        Item it = stockItem(1, 18, "5.000");
        it.quantity = 10;
        stock(it);
        SaleDto s = svc.createSale(SHOP, req(Enums.SaleType.SALE, null, List.of(itemQty(1, "640", "60", 3)), null,
                Enums.PaymentMode.CASH, null, null));
        assertEquals(7, it.quantity);
        assertEquals(Enums.ItemStatus.IN_STOCK, it.status);
        assertEquals(3, s.lines().get(0).quantity());
        assertEquals(d("10500.00"), s.subtotal()); // 3 × 5 g × (640 + 60)
        verify(items, never()).delete(any(Item.class));
    }

    @Test
    void sellingTheLastPiecesMarksSoldOutButNeverDeletes() {
        Item it = stockItem(1, 18, "5.000");
        it.quantity = 2;
        stock(it);
        svc.createSale(SHOP, req(Enums.SaleType.SALE, null, List.of(itemQty(1, "640", "0", 2)), null,
                Enums.PaymentMode.CASH, null, null));
        assertEquals(0, it.quantity);
        assertEquals(Enums.ItemStatus.SOLD, it.status);
        verify(items, never()).delete(any(Item.class));
        verify(items, never()).deleteById(any());
    }

    @Test
    void cannotSellMoreThanAvailable() {
        Item it = stockItem(1, 18, "5.000");
        it.quantity = 2;
        stock(it);
        AppException e = assertThrows(AppException.class, () -> svc.createSale(SHOP, req(Enums.SaleType.SALE, null,
                List.of(itemQty(1, "640", "0", 3)), null, Enums.PaymentMode.CASH, null, null)));
        assertEquals("INSUFFICIENT_STOCK", e.code());
        assertEquals(2, it.quantity);
    }

    @Test
    void duplicateItemRejected() {
        AppException e = assertThrows(AppException.class, () -> svc.createSale(SHOP, req(Enums.SaleType.SALE, null,
                List.of(item(1, "640", "0"), item(1, "640", "0")), null, Enums.PaymentMode.CASH, null, null)));
        assertEquals("DUPLICATE_ITEM", e.code());
    }

    @Test
    void unknownOrForeignItemIsNotFound() {
        stock(); // aucun article pour ce commerçant
        assertThrows(AppException.class, () -> svc.createSale(SHOP, req(Enums.SaleType.SALE, null,
                List.of(item(99, "640", "0")), null, Enums.PaymentMode.CASH, null, null)));
    }

    @Test
    void zeroPriceIsRejected() {
        stock(stockItem(1, 18, "10.000"));
        AppException e = assertThrows(AppException.class, () -> svc.createSale(SHOP,
                req(Enums.SaleType.SALE, null, List.of(item(1, "0", "100")), null, Enums.PaymentMode.CASH, null, null)));
        assertEquals("INVALID_PRICE", e.code());
    }

    @Test
    void freeLineNeedsDescriptionKaratAndWeight() {
        AppException e = assertThrows(AppException.class, () -> svc.createSale(SHOP, req(Enums.SaleType.SALE, null,
                List.of(new LineIn(null, " ", 18, d("2"), d("640"), d("0"), null)), null, Enums.PaymentMode.CASH, null, null)));
        assertEquals("INVALID_LINE", e.code());
        SaleDto ok = svc.createSale(SHOP, req(Enums.SaleType.SALE, null,
                List.of(new LineIn(null, "Alliance sur mesure", 18, d("2"), d("640"), d("50"), null)), null, Enums.PaymentMode.CASH, null, null));
        assertEquals(d("1380.00"), ok.subtotal());
    }

    @Test
    void payInstallmentOnlyOnce() {
        Installment in = new Installment();
        in.id = 5L; in.shopId = SHOP; in.saleId = 1L; in.seq = 1; in.amount = d("100"); in.dueDate = java.time.LocalDate.now();
        when(installments.findByIdAndShopId(5L, SHOP)).thenReturn(java.util.Optional.of(in));
        assertTrue(svc.payInstallment(SHOP, 5L).paid());
        assertEquals("ALREADY_PAID", assertThrows(AppException.class, () -> svc.payInstallment(SHOP, 5L)).code());
        when(installments.findByIdAndShopId(6L, SHOP)).thenReturn(java.util.Optional.empty());
        assertThrows(AppException.class, () -> svc.payInstallment(SHOP, 6L));
    }
}
