package com.orgest.service;

import com.orgest.common.AppException;
import com.orgest.common.InstallmentPlanner;
import com.orgest.common.Money;
import com.orgest.common.Pricing;
import com.orgest.common.Text;
import com.orgest.domain.*;
import com.orgest.repo.*;
import com.orgest.web.Dtos.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SalesService {
    private final SaleRepository sales;
    private final BuybackRepository buybacks;
    private final InstallmentRepository installments;
    private final ItemRepository items;
    private final CounterService counters;
    private final AuditService audit;

    public SalesService(SaleRepository sales, BuybackRepository buybacks, InstallmentRepository installments,
                        ItemRepository items, CounterService counters, AuditService audit) {
        this.sales = sales;
        this.buybacks = buybacks;
        this.installments = installments;
        this.items = items;
        this.counters = counters;
        this.audit = audit;
    }

    // ---------- Achat d'or ancien ----------
    static BuybackDto toDto(Buyback b) {
        return new BuybackDto(b.id, b.number, b.customerName, b.customerPhone, b.customerCin, b.description, b.karat,
                b.grossWeightG, b.deductionPct, b.netWeightG, b.pricePerGram, b.total, b.createdAt);
    }

    private Buyback buildBuyback(Long shopId, BuybackRequest r) {
        ShopService.checkKarat(r.karat());
        Buyback b = new Buyback();
        b.shopId = shopId;
        b.number = counters.next(shopId, "BUYBACK", "R-");
        b.customerName = Text.blankToNull(r.customerName());
        b.customerPhone = Text.blankToNull(r.customerPhone());
        b.customerCin = Text.blankToNull(r.customerCin());
        b.description = Text.blankToNull(r.description());
        b.karat = r.karat();
        b.grossWeightG = Money.round3(r.grossWeightG());
        b.deductionPct = Money.round2(r.deductionPct());
        b.netWeightG = Pricing.netWeight(b.grossWeightG, b.deductionPct);
        b.pricePerGram = Money.round2(r.pricePerGram());
        if (b.pricePerGram.signum() <= 0) throw AppException.bad("INVALID_PRICE");
        b.total = Pricing.tradeIn(b.netWeightG, b.pricePerGram);
        return buybacks.save(b);
    }

    @Transactional
    public BuybackDto createBuyback(Long shopId, BuybackRequest r) {
        Buyback b = buildBuyback(shopId, r);
        audit.log(shopId, null, "BUYBACK_CREATE", b.number, null);
        return toDto(b);
    }

    @Transactional(readOnly = true)
    public PageDto<BuybackDto> listBuybacks(Long shopId, int page, int size) {
        Page<Buyback> p = buybacks.findByShopIdOrderByCreatedAtDesc(shopId,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
        return new PageDto<>(p.getContent().stream().map(SalesService::toDto).toList(), p.getTotalElements(),
                p.getNumber(), p.getSize());
    }

    @Transactional(readOnly = true)
    public BuybackDto getBuyback(Long shopId, Long id) {
        return toDto(buybacks.findByIdAndShopId(id, shopId).orElseThrow(AppException::notFound));
    }

    // ---------- Vente / Échange ----------
    @Transactional
    public SaleDto createSale(Long shopId, SaleRequest r) {
        Enums.SaleType type = r.type() == null ? Enums.SaleType.SALE : r.type();
        if (type == Enums.SaleType.EXCHANGE && r.oldGold() == null) throw AppException.bad("OLD_GOLD_REQUIRED");

        // Articles du stock : verrouillés (PESSIMISTIC_WRITE) pour interdire la double vente.
        List<Long> ids = r.lines().stream().map(LineIn::itemId).filter(Objects::nonNull).toList();
        if (new HashSet<>(ids).size() != ids.size()) throw AppException.bad("DUPLICATE_ITEM");
        Map<Long, Item> stock = ids.isEmpty() ? Map.of()
                : items.findByShopIdAndIdIn(shopId, ids).stream().collect(Collectors.toMap(i -> i.id, i -> i));
        if (stock.size() != ids.size()) throw AppException.notFound();

        Sale s = new Sale();
        s.shopId = shopId;
        s.number = counters.next(shopId, "SALE", "V-");
        s.type = type;
        s.customerName = Text.blankToNull(r.customerName());
        s.customerPhone = Text.blankToNull(r.customerPhone());

        BigDecimal subtotal = BigDecimal.ZERO;
        for (LineIn l : r.lines()) {
            SaleLine line = new SaleLine();
            line.sale = s;
            int qty = l.quantity() == null ? 1 : l.quantity();
            line.quantity = qty;
            if (l.itemId() != null) {
                Item it = stock.get(l.itemId());
                if (it.quantity <= 0) throw AppException.conflict("ITEM_NOT_IN_STOCK");
                if (qty > it.quantity) throw AppException.conflict("INSUFFICIENT_STOCK");
                line.itemId = it.id;
                line.description = it.name + " (" + it.ref + ")";
                line.karat = it.karat;
                line.weightG = it.weightG;
                // Le stock diminue ; à 0 l'article reste en base (épuisé), il n'est jamais supprimé.
                it.quantity -= qty;
                it.status = it.quantity > 0 ? Enums.ItemStatus.IN_STOCK : Enums.ItemStatus.SOLD;
            } else {
                if (Text.blankToNull(l.description()) == null || l.karat() == null || l.weightG() == null) {
                    throw AppException.bad("INVALID_LINE");
                }
                ShopService.checkKarat(l.karat());
                line.description = l.description().trim();
                line.karat = l.karat();
                line.weightG = Money.round3(l.weightG());
            }
            line.pricePerGram = Money.round2(l.pricePerGram());
            if (line.pricePerGram.signum() <= 0) throw AppException.bad("INVALID_PRICE");
            line.makingPerGram = Money.round2(l.makingPerGram());
            line.lineTotal = Pricing.lineTotal(line.weightG, line.pricePerGram, line.makingPerGram, qty);
            subtotal = subtotal.add(line.lineTotal);
            s.lines.add(line);
        }
        s.subtotal = Money.round2(subtotal);

        Buyback tradeIn = null;
        if (r.oldGold() != null) {
            tradeIn = buildBuyback(shopId, withCustomer(r.oldGold(), r));
            s.tradeInAmount = tradeIn.total;
            s.buybackId = tradeIn.id;
        }
        s.balance = Money.round2(s.subtotal.subtract(s.tradeInAmount));

        BigDecimal paidNow;
        List<Installment> plan = new ArrayList<>();
        if (r.paymentMode() == Enums.PaymentMode.INSTALLMENT) {
            BigDecimal down = Money.round2(Money.nz(r.downPayment()));
            InstallmentPlanner.validate(s.customerName, s.balance, down, r.months());
            int months = r.months();
            s.paymentMode = Enums.PaymentMode.INSTALLMENT;
            s.months = months;
            s.downPayment = down;
            paidNow = down;
            for (InstallmentPlanner.Term t : InstallmentPlanner.schedule(s.balance, down, months, Money.today())) {
                Installment in = new Installment();
                in.shopId = shopId;
                in.seq = t.seq();
                in.dueDate = t.dueDate();
                in.amount = t.amount();
                plan.add(in);
            }
        } else {
            s.paymentMode = Enums.PaymentMode.CASH;
            s.months = 0;
            paidNow = s.balance.signum() > 0 ? s.balance : BigDecimal.ZERO;
            s.downPayment = paidNow;
        }

        sales.save(s);
        items.saveAll(stock.values());
        for (Installment in : plan) in.saleId = s.id;
        installments.saveAll(plan);
        audit.log(shopId, null, type == Enums.SaleType.EXCHANGE ? "EXCHANGE_CREATE" : "SALE_CREATE", s.number, null);
        return detailOf(s, plan, tradeIn);
    }

    private BuybackRequest withCustomer(BuybackRequest o, SaleRequest r) {
        return new BuybackRequest(
                Text.blankToNull(o.customerName()) != null ? o.customerName() : r.customerName(),
                Text.blankToNull(o.customerPhone()) != null ? o.customerPhone() : r.customerPhone(),
                o.customerCin(), o.description(), o.karat(), o.grossWeightG(), o.deductionPct(), o.pricePerGram());
    }

    @Transactional(readOnly = true)
    public SaleDto getSale(Long shopId, Long id) {
        Sale s = sales.findDetail(id, shopId).orElseThrow(AppException::notFound);
        Buyback b = s.buybackId == null ? null : buybacks.findByIdAndShopId(s.buybackId, shopId).orElse(null);
        return detailOf(s, installments.findBySaleIdAndShopIdOrderBySeqAsc(s.id, shopId), b);
    }

    private SaleDto detailOf(Sale s, List<Installment> plan, Buyback b) {
        List<LineDto> lines = s.lines.stream()
                .map(l -> new LineDto(l.description, l.karat, l.weightG, l.pricePerGram, l.makingPerGram, l.lineTotal, l.quantity))
                .toList();
        return new SaleDto(s.id, s.number, s.type.name(), s.customerName, s.customerPhone, s.subtotal,
                s.tradeInAmount, s.balance, s.paymentMode.name(), s.downPayment, s.months, s.createdAt, lines,
                plan.stream().map(SalesService::toDto).toList(), b == null ? null : toDto(b));
    }

    static InstallmentDto toDto(Installment i) {
        return new InstallmentDto(i.id, i.seq, i.dueDate, i.amount, i.paid, i.paidAt,
                !i.paid && i.dueDate.isBefore(Money.today()));
    }

    static SaleSummary summary(Sale s) {
        return new SaleSummary(s.id, s.number, s.type.name(), s.customerName, s.subtotal, s.balance,
                s.paymentMode.name(), s.createdAt);
    }

    @Transactional(readOnly = true)
    public PageDto<SaleSummary> listSales(Long shopId, int page, int size) {
        Page<Sale> p = sales.findByShopIdOrderByCreatedAtDesc(shopId,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
        return new PageDto<>(p.getContent().stream().map(SalesService::summary).toList(), p.getTotalElements(),
                p.getNumber(), p.getSize());
    }

    // ---------- Échéances (تقسيط) ----------
    @Transactional(readOnly = true)
    public List<PlanDto> plans(Long shopId) {
        List<Installment> all = installments.findByShopIdOrderByDueDateAscSeqAsc(shopId);
        Map<Long, List<Installment>> bySale = all.stream()
                .collect(Collectors.groupingBy(i -> i.saleId, LinkedHashMap::new, Collectors.toList()));
        Map<Long, Sale> saleMap = sales.findAllById(bySale.keySet()).stream()
                .filter(s -> s.shopId.equals(shopId)).collect(Collectors.toMap(s -> s.id, s -> s));
        LocalDate today = Money.today();
        List<PlanDto> out = new ArrayList<>();
        for (var e : bySale.entrySet()) {
            Sale s = saleMap.get(e.getKey());
            if (s == null) continue;
            List<Installment> list = e.getValue().stream().sorted(Comparator.comparingInt(i -> i.seq)).toList();
            BigDecimal remaining = list.stream().filter(i -> !i.paid).map(i -> i.amount).reduce(BigDecimal.ZERO, BigDecimal::add);
            if (remaining.signum() == 0) continue;
            BigDecimal paid = list.stream().filter(i -> i.paid).map(i -> i.amount).reduce(BigDecimal.ZERO, BigDecimal::add);
            LocalDate next = list.stream().filter(i -> !i.paid).map(i -> i.dueDate).min(Comparator.naturalOrder()).orElse(null);
            long overdue = list.stream().filter(i -> !i.paid && i.dueDate.isBefore(today)).count();
            out.add(new PlanDto(s.id, s.number, s.customerName, s.customerPhone, remaining, paid, next, overdue,
                    s.balance, s.downPayment,
                    list.stream().map(SalesService::toDto).toList()));
        }
        out.sort(Comparator.comparing(PlanDto::nextDue, Comparator.nullsLast(Comparator.naturalOrder())));
        return out;
    }

    @Transactional
    public InstallmentDto payInstallment(Long shopId, Long id) {
        Installment i = installments.findByIdAndShopId(id, shopId).orElseThrow(AppException::notFound);
        if (i.paid) throw AppException.conflict("ALREADY_PAID");
        i.paid = true;
        i.paidAt = java.time.Instant.now();
        installments.save(i);
        audit.log(shopId, null, "INSTALLMENT_PAID", "installment=" + id, null);
        return toDto(i);
    }
}
