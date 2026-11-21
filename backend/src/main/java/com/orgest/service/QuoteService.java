package com.orgest.service;

import com.orgest.common.AppException;
import com.orgest.common.Money;
import com.orgest.common.Pricing;
import com.orgest.common.Text;
import com.orgest.domain.Enums;
import com.orgest.domain.Item;
import com.orgest.domain.Quote;
import com.orgest.domain.Quote.Status;
import com.orgest.domain.QuoteLine;
import com.orgest.repo.ItemRepository;
import com.orgest.repo.QuoteRepository;
import com.orgest.web.Dtos.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Devis : proposition de prix figée, jamais de mouvement de stock avant la conversion en vente. */
@Service
public class QuoteService {
    private final QuoteRepository quotes;
    private final ItemRepository items;
    private final CounterService counters;
    private final AuditService audit;
    private final SalesService sales;

    public QuoteService(QuoteRepository quotes, ItemRepository items, CounterService counters, AuditService audit,
                        SalesService sales) {
        this.quotes = quotes;
        this.items = items;
        this.counters = counters;
        this.audit = audit;
        this.sales = sales;
    }

    @Transactional
    public QuoteDto create(Long shopId, QuoteRequest r) {
        Quote q = new Quote();
        q.shopId = shopId;
        q.number = counters.next(shopId, "QUOTE", "D-");
        fill(shopId, q, r);
        quotes.save(q);
        audit.log(shopId, null, "QUOTE_CREATE", q.number, null);
        return toDto(q);
    }

    @Transactional
    public QuoteDto update(Long shopId, Long id, QuoteRequest r) {
        Quote q = find(shopId, id);
        if (q.status == Status.CONVERTED) throw AppException.conflict("QUOTE_CONVERTED");
        q.lines.clear();
        fill(shopId, q, r);
        if (q.status != Status.DRAFT) q.status = Status.DRAFT;
        audit.log(shopId, null, "QUOTE_UPDATE", q.number, null);
        return toDto(q);
    }

    private void fill(Long shopId, Quote q, QuoteRequest r) {
        q.customerName = Text.blankToNull(r.customerName());
        q.customerPhone = Text.blankToNull(r.customerPhone());
        q.note = Text.blankToNull(r.note());
        q.validUntil = Money.today().plusDays(r.validDays() == null ? 15 : r.validDays());

        List<Long> ids = r.lines().stream().map(LineIn::itemId).filter(java.util.Objects::nonNull).toList();
        java.util.Map<Long, Item> stock = new java.util.HashMap<>();
        if (!ids.isEmpty()) {
            for (Item i : items.findByShopIdAndIdIn(shopId, ids)) stock.put(i.id, i);
            if (stock.size() != new java.util.HashSet<>(ids).size()) throw AppException.notFound();
        }
        BigDecimal subtotal = BigDecimal.ZERO;
        for (LineIn l : r.lines()) {
            QuoteLine line = new QuoteLine();
            line.quote = q;
            line.quantity = l.quantity() == null ? 1 : l.quantity();
            if (l.itemId() != null) {
                Item it = stock.get(l.itemId());
                line.itemId = it.id;
                line.description = it.name + " (" + it.ref + ")";
                line.karat = it.karat;
                line.weightG = it.weightG;
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
            line.lineTotal = Pricing.lineTotal(line.weightG, line.pricePerGram, line.makingPerGram, line.quantity);
            subtotal = subtotal.add(line.lineTotal);
            q.lines.add(line);
        }
        q.subtotal = Money.round2(subtotal);
    }

    @Transactional(readOnly = true)
    public PageDto<QuoteSummary> list(Long shopId, int page, int size) {
        Page<Quote> p = quotes.findByShopIdOrderByCreatedAtDesc(shopId,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
        return new PageDto<>(p.getContent().stream().map(this::summary).toList(),
                p.getTotalElements(), p.getNumber(), p.getSize());
    }

    @Transactional(readOnly = true)
    public QuoteDto get(Long shopId, Long id) { return toDto(find(shopId, id)); }

    /** Transitions manuelles : envoyé, accepté, refusé. « Converti » n'est atteint que par {@link #convert}. */
    @Transactional
    public QuoteDto setStatus(Long shopId, Long id, String status) {
        Quote q = find(shopId, id);
        Status next;
        try { next = Status.valueOf(status); } catch (IllegalArgumentException e) { throw AppException.bad("INVALID_STATUS"); }
        if (next == Status.CONVERTED || next == Status.DRAFT) throw AppException.bad("INVALID_STATUS");
        if (q.status == Status.CONVERTED) throw AppException.conflict("QUOTE_CONVERTED");
        q.status = next;
        audit.log(shopId, null, "QUOTE_" + next.name(), q.number, null);
        return toDto(q);
    }

    @Transactional
    public SaleDto convert(Long shopId, Long id, QuoteConvertRequest c) {
        Quote q = find(shopId, id);
        if (q.status == Status.CONVERTED) throw AppException.conflict("QUOTE_CONVERTED");
        if (q.status == Status.REJECTED) throw AppException.conflict("QUOTE_REJECTED");
        List<LineIn> lines = new ArrayList<>();
        for (QuoteLine l : q.lines) {
            lines.add(new LineIn(l.itemId, l.description, l.karat, l.weightG, l.pricePerGram, l.makingPerGram, l.quantity));
        }
        Enums.PaymentMode mode = c == null || c.paymentMode() == null ? Enums.PaymentMode.CASH : c.paymentMode();
        SaleRequest sr = new SaleRequest(Enums.SaleType.SALE, q.customerName, q.customerPhone, lines, null, mode,
                c == null ? null : c.downPayment(), c == null ? null : c.months(), c == null ? null : c.payMethod(),
                "Q" + shopId + "-" + q.id + "-" + q.number.replaceAll("[^A-Za-z0-9]", ""));
        SaleDto sale = sales.createSale(shopId, sr);
        q.status = Status.CONVERTED;
        q.saleId = sale.id();
        audit.log(shopId, null, "QUOTE_CONVERT", q.number + " -> " + sale.number(), null);
        return sale;
    }

    private Quote find(Long shopId, Long id) { return quotes.findByIdAndShopId(id, shopId).orElseThrow(AppException::notFound); }

    private static boolean expired(Quote q) {
        return (q.status == Status.DRAFT || q.status == Status.SENT) && q.validUntil.isBefore(Money.today());
    }

    private QuoteSummary summary(Quote q) {
        return new QuoteSummary(q.id, q.number, q.status.name(), q.customerName, q.subtotal, q.validUntil, expired(q), q.createdAt);
    }

    private QuoteDto toDto(Quote q) {
        return new QuoteDto(q.id, q.number, q.status.name(), q.customerName, q.customerPhone, q.note, q.validUntil,
                expired(q), q.subtotal, q.saleId, q.createdAt,
                q.lines.stream().map(l -> new LineDto(l.description, l.karat, l.weightG, l.pricePerGram,
                        l.makingPerGram, l.lineTotal, l.quantity)).toList());
    }
}
