package com.orgest.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.orgest.common.AppException;
import com.orgest.domain.Enums;
import com.orgest.domain.GoldPrice;
import com.orgest.domain.Item;
import com.orgest.repo.*;
import com.orgest.web.Dtos.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

class ShopServiceTests {
    private static final long SHOP = 5L;
    private GoldPriceRepository prices;
    private ItemRepository items;
    private ShopService svc;

    private static BigDecimal d(String s) { return new BigDecimal(s); }

    @BeforeEach
    void setUp() {
        prices = mock(GoldPriceRepository.class);
        items = mock(ItemRepository.class);
        CounterService counters = mock(CounterService.class);
        when(counters.next(anyLong(), eq("ITEM"), anyString())).thenReturn("A-00001");
        when(items.save(any(Item.class))).thenAnswer(i -> { Item it = i.getArgument(0); it.id = 1L; return it; });
        when(prices.findByShopIdOrderByKaratAsc(SHOP)).thenReturn(List.of());
        svc = new ShopService(prices, items, mock(UserRepository.class), counters, mock(PhotoService.class),
                mock(PasswordEncoder.class), mock(AuditService.class));
    }

    @Test
    void pricesDefaultToZeroForAllKarats() {
        List<PriceDto> p = svc.prices(SHOP);
        assertEquals(List.of(18, 21, 24, 800, 925, 999), p.stream().map(PriceDto::karat).toList());
        assertTrue(p.stream().allMatch(x -> x.sellPerGram().signum() == 0 && x.buyPerGram().signum() == 0));
    }

    @Test
    void buyPriceCannotExceedSellPrice() {
        UpdatePricesRequest r = new UpdatePricesRequest(List.of(new PriceIn(18, d("600"), d("601"))));
        assertEquals("BUY_ABOVE_SELL", assertThrows(AppException.class, () -> svc.updatePrices(SHOP, r)).code());
        verify(prices, never()).save(any());
    }

    @Test
    void unknownKaratRejected() {
        UpdatePricesRequest r = new UpdatePricesRequest(List.of(new PriceIn(14, d("600"), d("500"))));
        assertEquals("INVALID_KARAT", assertThrows(AppException.class, () -> svc.updatePrices(SHOP, r)).code());
    }

    @Test
    void pricesAreRoundedAndSaved() {
        when(prices.findByShopIdAndKarat(eq(SHOP), anyInt())).thenReturn(Optional.empty());
        svc.updatePrices(SHOP, new UpdatePricesRequest(List.of(new PriceIn(18, d("640.005"), d("560.004")))));
        var cap = org.mockito.ArgumentCaptor.forClass(GoldPrice.class);
        verify(prices).save(cap.capture());
        assertEquals(d("640.01"), cap.getValue().sellPerGram);
        assertEquals(d("560.00"), cap.getValue().buyPerGram);
        assertEquals(SHOP, cap.getValue().shopId);
    }

    @Test
    void createItemNormalisesFields() {
        ItemDto i = svc.createItem(SHOP, new ItemRequest("  Bracelet  ", " bracelet ", 21, d("12.3456"), d("65.555"), "  ", 4));
        assertEquals("A-00001", i.ref());
        assertEquals("Bracelet", i.name());
        assertEquals(d("12.346"), i.weightG());
        assertEquals(d("65.56"), i.makingPerGram());
        assertNull(i.note());
        assertEquals("IN_STOCK", i.status());
    }

    @Test
    void createItemKeepsTheQuantityAndDefaultsToOne() {
        assertEquals(4, svc.createItem(SHOP, new ItemRequest("A", "ring", 18, d("1"), d("0"), null, 4)).quantity());
        assertEquals(1, svc.createItem(SHOP, new ItemRequest("A", "ring", 18, d("1"), d("0"), null, null)).quantity());
    }

    @Test
    void soldOutItemStaysVisibleAndCanBeRestocked() {
        Item it = new Item();
        it.id = 1L; it.shopId = SHOP; it.status = Enums.ItemStatus.SOLD; it.quantity = 0; it.karat = 18; it.weightG = d("1");
        it.name = "n"; it.category = "c";
        when(items.findByIdAndShopId(1L, SHOP)).thenReturn(Optional.of(it));
        ItemDto back = svc.updateItem(SHOP, 1L, new ItemRequest("n", "c", 18, d("1"), d("0"), null, 5));
        assertEquals(5, back.quantity());
        assertEquals("IN_STOCK", back.status());
        ItemDto out = svc.updateItem(SHOP, 1L, new ItemRequest("n", "c", 18, d("1"), d("0"), null, 0));
        assertEquals(0, out.quantity());
        assertEquals("SOLD", out.status());
        // sans quantité dans la requête, la quantité actuelle est conservée
        assertEquals(0, svc.updateItem(SHOP, 1L, new ItemRequest("n2", "c", 18, d("1"), d("0"), null, null)).quantity());
    }

    @Test
    void itemWithSalesHistoryIsNeverDeleted() {
        Item it = new Item();
        it.id = 1L; it.shopId = SHOP; it.quantity = 0; it.status = Enums.ItemStatus.SOLD; it.karat = 18; it.weightG = d("1");
        when(items.findByIdAndShopId(1L, SHOP)).thenReturn(Optional.of(it));
        when(items.saleLineCount(1L)).thenReturn(2L);
        assertEquals("ITEM_HAS_HISTORY", assertThrows(AppException.class, () -> svc.deleteItem(SHOP, 1L)).code());
        verify(items, never()).delete(any(Item.class));
    }

    @Test
    void neverSoldItemCanBeDeletedByMistake() {
        Item it = new Item();
        it.id = 2L; it.shopId = SHOP; it.quantity = 3; it.karat = 18; it.weightG = d("1");
        when(items.findByIdAndShopId(2L, SHOP)).thenReturn(Optional.of(it));
        when(items.saleLineCount(2L)).thenReturn(0L);
        svc.deleteItem(SHOP, 2L);
        verify(items).delete(it);
    }

    @Test
    void otherShopsItemIsNotFound() {
        when(items.findByIdAndShopId(1L, 99L)).thenReturn(Optional.empty());
        assertThrows(AppException.class, () -> svc.getItem(99L, 1L));
    }
}
