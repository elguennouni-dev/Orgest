package com.orgest.service;

import com.orgest.common.AppException;
import com.orgest.common.Money;
import com.orgest.common.Text;
import com.orgest.domain.*;
import com.orgest.repo.GoldPriceRepository;
import com.orgest.repo.ItemRepository;
import com.orgest.repo.UserRepository;
import com.orgest.web.Dtos.*;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Page;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ShopService {
    static final Set<Integer> KARATS = Set.of(18, 21, 24);
    private final GoldPriceRepository prices;
    private final ItemRepository items;
    private final UserRepository users;
    private final CounterService counters;
    private final PhotoService photos;
    private final PasswordEncoder encoder;
    private final AuditService audit;

    public ShopService(GoldPriceRepository prices, ItemRepository items, UserRepository users, CounterService counters,
                       PhotoService photos, PasswordEncoder encoder, AuditService audit) {
        this.prices = prices;
        this.items = items;
        this.users = users;
        this.counters = counters;
        this.photos = photos;
        this.encoder = encoder;
        this.audit = audit;
    }

    static void checkKarat(int karat) {
        if (!KARATS.contains(karat)) throw AppException.bad("INVALID_KARAT");
    }

    // ---------- Prix du jour ----------
    @Transactional(readOnly = true)
    public List<PriceDto> prices(Long shopId) {
        List<GoldPrice> rows = prices.findByShopIdOrderByKaratAsc(shopId);
        List<PriceDto> out = new ArrayList<>();
        for (int k : new int[]{18, 21, 24}) {
            GoldPrice g = rows.stream().filter(x -> x.karat == k).findFirst().orElse(null);
            out.add(g == null ? new PriceDto(k, BigDecimal.ZERO, BigDecimal.ZERO, null)
                    : new PriceDto(k, g.sellPerGram, g.buyPerGram, g.updatedAt));
        }
        return out;
    }

    @Transactional
    public List<PriceDto> updatePrices(Long shopId, UpdatePricesRequest r) {
        for (PriceIn p : r.prices()) {
            checkKarat(p.karat());
            if (p.buyPerGram().compareTo(p.sellPerGram()) > 0) throw AppException.bad("BUY_ABOVE_SELL");
            GoldPrice g = prices.findByShopIdAndKarat(shopId, p.karat()).orElseGet(() -> {
                GoldPrice n = new GoldPrice();
                n.shopId = shopId;
                n.karat = p.karat();
                return n;
            });
            g.sellPerGram = Money.round2(p.sellPerGram());
            g.buyPerGram = Money.round2(p.buyPerGram());
            g.updatedAt = java.time.Instant.now();
            prices.save(g);
        }
        return prices(shopId);
    }

    // ---------- Stock ----------
    static ItemDto toDto(Item i) {
        return new ItemDto(i.id, i.ref, i.name, i.category, i.karat, i.weightG, i.makingPerGram, i.status.name(),
                i.photoFile != null, i.note, i.createdAt);
    }

    @Transactional(readOnly = true)
    public PageDto<ItemDto> listItems(Long shopId, Enums.ItemStatus status, String q, int karat, int page, int size) {
        int sz = Math.min(Math.max(size, 1), 100);
        String query = q == null ? "" : Text.clean(q, 60);
        Page<Item> p = items.search(shopId, status, query, karat, PageRequest.of(Math.max(page, 0), sz));
        return new PageDto<>(p.getContent().stream().map(ShopService::toDto).toList(), p.getTotalElements(),
                p.getNumber(), p.getSize());
    }

    @Transactional(readOnly = true)
    public ItemDto getItem(Long shopId, Long id) {
        return toDto(items.findByIdAndShopId(id, shopId).orElseThrow(AppException::notFound));
    }

    @Transactional
    public ItemDto createItem(Long shopId, ItemRequest r) {
        checkKarat(r.karat());
        Item i = new Item();
        i.shopId = shopId;
        i.ref = counters.next(shopId, "ITEM", "A-");
        apply(i, r);
        return toDto(items.save(i));
    }

    @Transactional
    public ItemDto updateItem(Long shopId, Long id, ItemRequest r) {
        checkKarat(r.karat());
        Item i = items.findByIdAndShopId(id, shopId).orElseThrow(AppException::notFound);
        if (i.status != Enums.ItemStatus.IN_STOCK) throw AppException.conflict("ITEM_NOT_IN_STOCK");
        apply(i, r);
        return toDto(items.save(i));
    }

    private void apply(Item i, ItemRequest r) {
        i.name = r.name().trim();
        i.category = r.category().trim();
        i.karat = r.karat();
        i.weightG = Money.round3(r.weightG());
        i.makingPerGram = Money.round2(r.makingPerGram());
        i.note = Text.blankToNull(r.note());
    }

    @Transactional
    public void deleteItem(Long shopId, Long id) {
        Item i = items.findByIdAndShopId(id, shopId).orElseThrow(AppException::notFound);
        if (i.status != Enums.ItemStatus.IN_STOCK) throw AppException.conflict("ITEM_NOT_IN_STOCK");
        photos.delete(shopId, i.photoFile);
        items.delete(i);
    }

    @Transactional
    public ItemDto setPhoto(Long shopId, Long id, MultipartFile file) {
        Item i = items.findByIdAndShopId(id, shopId).orElseThrow(AppException::notFound);
        String name = photos.store(shopId, file);
        String old = i.photoFile;
        i.photoFile = name;
        items.save(i);
        photos.delete(shopId, old);
        return toDto(i);
    }

    @Transactional(readOnly = true)
    public Path photoPath(Long shopId, Long id) {
        Item i = items.findByIdAndShopId(id, shopId).orElseThrow(AppException::notFound);
        return photos.resolve(shopId, i.photoFile);
    }

    // ---------- Compte ----------
    @Transactional
    public MeResponse updateProfile(Long shopId, UpdateProfileRequest r) {
        AppUser u = users.findById(shopId).orElseThrow(AppException::notFound);
        u.shopName = r.shopName().trim();
        u.ownerName = Text.blankToNull(r.ownerName());
        u.phone = Text.blankToNull(r.phone());
        u.city = Text.blankToNull(r.city());
        u.address = Text.blankToNull(r.address());
        u.ice = Text.blankToNull(r.ice());
        u.receiptFooter = Text.blankToNull(r.receiptFooter());
        return AuthService.toMe(users.save(u));
    }

    /** Retourne l'utilisateur mis à jour (le contrôleur ré-émet un nouveau jeton : l'ancien est invalidé). */
    @Transactional
    public AppUser changePassword(Long shopId, ChangePasswordRequest r, String ip) {
        AppUser u = users.findById(shopId).orElseThrow(AppException::notFound);
        if (!encoder.matches(r.currentPassword(), u.passwordHash)) {
            audit.log(u.id, u.username, "PASSWORD_CHANGE_FAIL", null, ip);
            throw AppException.bad("WRONG_PASSWORD");
        }
        PasswordPolicy.check(r.newPassword(), u.username);
        u.passwordHash = encoder.encode(r.newPassword());
        u.tokenVersion++;
        users.save(u);
        audit.log(u.id, u.username, "PASSWORD_CHANGE", null, ip);
        return u;
    }
}
