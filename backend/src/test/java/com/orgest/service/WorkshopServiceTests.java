package com.orgest.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.orgest.common.AppException;
import com.orgest.domain.Enums;
import com.orgest.domain.WorkshopOrder;
import com.orgest.repo.WorkshopRepository;
import com.orgest.web.Dtos.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class WorkshopServiceTests {
    private static final long SHOP = 3L;
    private WorkshopRepository repo;
    private WorkshopService svc;

    private static BigDecimal d(String s) { return new BigDecimal(s); }

    @BeforeEach
    void setUp() {
        repo = mock(WorkshopRepository.class);
        CounterService counters = mock(CounterService.class);
        when(counters.next(anyLong(), anyString(), anyString())).thenReturn("C-00001");
        when(repo.save(any(WorkshopOrder.class))).thenAnswer(i -> { WorkshopOrder w = i.getArgument(0); w.id = 9L; return w; });
        svc = new WorkshopService(repo, counters);
    }

    private static WorkshopRequest req(String deposit, String price) {
        return new WorkshopRequest("Client", "0600000000", "Bague à resserrer", 18, "Si Ahmed", null,
                d("12.500"), d("300"), d(deposit), d(price), LocalDate.now().plusDays(7), null);
    }

    private WorkshopOrder stored(Enums.WorkshopStatus st) {
        WorkshopOrder w = new WorkshopOrder();
        w.id = 9L; w.shopId = SHOP; w.status = st; w.givenWeightG = d("12.500"); w.karat = 18;
        when(repo.findByIdAndShopId(9L, SHOP)).thenReturn(Optional.of(w));
        return w;
    }

    @Test
    void createRoundsAndStartsAsSent() {
        WorkshopDto w = svc.create(SHOP, req("100", "800"));
        assertEquals("SENT", w.status());
        assertEquals("C-00001", w.number());
        assertEquals(d("12.500"), w.givenWeightG());
        assertNull(w.lossG());
    }

    @Test
    void depositCannotExceedAgreedPrice() {
        assertEquals("DEPOSIT_ABOVE_PRICE", assertThrows(AppException.class, () -> svc.create(SHOP, req("900", "800"))).code());
        assertEquals("DEPOSIT_ABOVE_PRICE", assertThrows(AppException.class, () -> svc.create(SHOP, req("1", "0"))).code());
        assertDoesNotThrow(() -> svc.create(SHOP, req("800", "800")));
    }

    @Test
    void invalidKaratRejected() {
        WorkshopRequest r = new WorkshopRequest("C", null, "x", 22, "A", null, d("1"), d("0"), d("0"), d("0"), null, null);
        assertEquals("INVALID_KARAT", assertThrows(AppException.class, () -> svc.create(SHOP, r)).code());
    }

    @Test
    void readyNeedsReceivedWeightAndComputesLoss() {
        stored(Enums.WorkshopStatus.SENT);
        assertEquals("WEIGHT_REQUIRED", assertThrows(AppException.class,
                () -> svc.setStatus(SHOP, 9L, new WorkshopStatusRequest(Enums.WorkshopStatus.READY, null))).code());
        assertEquals("WEIGHT_REQUIRED", assertThrows(AppException.class,
                () -> svc.setStatus(SHOP, 9L, new WorkshopStatusRequest(Enums.WorkshopStatus.READY, d("0")))).code());
        WorkshopDto w = svc.setStatus(SHOP, 9L, new WorkshopStatusRequest(Enums.WorkshopStatus.READY, d("12.350")));
        assertEquals("READY", w.status());
        assertEquals(d("0.150"), w.lossG());
    }

    @Test
    void cannotDeliverBeforeReady() {
        stored(Enums.WorkshopStatus.SENT);
        assertEquals("INVALID_TRANSITION", assertThrows(AppException.class,
                () -> svc.setStatus(SHOP, 9L, new WorkshopStatusRequest(Enums.WorkshopStatus.DELIVERED, null))).code());
    }

    @Test
    void readyThenDelivered() {
        WorkshopOrder w = stored(Enums.WorkshopStatus.READY);
        w.receivedWeightG = d("12.4");
        assertEquals("DELIVERED", svc.setStatus(SHOP, 9L, new WorkshopStatusRequest(Enums.WorkshopStatus.DELIVERED, null)).status());
    }

    @Test
    void closedOrdersAreFrozen() {
        for (Enums.WorkshopStatus st : new Enums.WorkshopStatus[]{Enums.WorkshopStatus.DELIVERED, Enums.WorkshopStatus.CANCELLED}) {
            stored(st);
            assertEquals("INVALID_TRANSITION", assertThrows(AppException.class,
                    () -> svc.setStatus(SHOP, 9L, new WorkshopStatusRequest(Enums.WorkshopStatus.READY, d("5")))).code());
            assertEquals("ORDER_CLOSED", assertThrows(AppException.class, () -> svc.update(SHOP, 9L, req("0", "100"))).code());
        }
    }

    @Test
    void cannotGoBackToSent() {
        stored(Enums.WorkshopStatus.READY);
        assertEquals("INVALID_TRANSITION", assertThrows(AppException.class,
                () -> svc.setStatus(SHOP, 9L, new WorkshopStatusRequest(Enums.WorkshopStatus.SENT, null))).code());
    }

    @Test
    void otherShopsOrderIsNotFound() {
        when(repo.findByIdAndShopId(9L, 999L)).thenReturn(Optional.empty());
        assertThrows(AppException.class, () -> svc.get(999L, 9L));
    }
}
