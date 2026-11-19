package com.orgest.service;

import com.orgest.common.AppException;
import com.orgest.common.Money;
import com.orgest.common.Text;
import com.orgest.domain.Enums;
import com.orgest.domain.WorkshopOrder;
import com.orgest.repo.WorkshopRepository;
import com.orgest.web.Dtos.*;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkshopService {
    private final WorkshopRepository repo;
    private final CounterService counters;

    public WorkshopService(WorkshopRepository repo, CounterService counters) {
        this.repo = repo;
        this.counters = counters;
    }

    static WorkshopDto toDto(WorkshopOrder w) {
        BigDecimal loss = w.receivedWeightG == null ? null : w.givenWeightG.subtract(w.receivedWeightG);
        return new WorkshopDto(w.id, w.number, w.customerName, w.customerPhone, w.description, w.karat,
                w.artisanName, w.artisanPhone, w.givenWeightG, w.receivedWeightG, loss, w.labourCost,
                w.depositAmount, w.agreedPrice, w.dueDate, w.status.name(), w.note, w.createdAt);
    }

    @Transactional(readOnly = true)
    public List<WorkshopDto> list(Long shopId) {
        return repo.findByShopIdOrderByCreatedAtDesc(shopId).stream().map(WorkshopService::toDto).toList();
    }

    @Transactional(readOnly = true)
    public WorkshopDto get(Long shopId, Long id) {
        return toDto(repo.findByIdAndShopId(id, shopId).orElseThrow(AppException::notFound));
    }

    @Transactional
    public WorkshopDto create(Long shopId, WorkshopRequest r) {
        ShopService.checkKarat(r.karat());
        WorkshopOrder w = new WorkshopOrder();
        w.shopId = shopId;
        w.number = counters.next(shopId, "WORKSHOP", "C-");
        apply(w, r);
        return toDto(repo.save(w));
    }

    @Transactional
    public WorkshopDto update(Long shopId, Long id, WorkshopRequest r) {
        ShopService.checkKarat(r.karat());
        WorkshopOrder w = repo.findByIdAndShopId(id, shopId).orElseThrow(AppException::notFound);
        if (w.status == Enums.WorkshopStatus.DELIVERED || w.status == Enums.WorkshopStatus.CANCELLED) {
            throw AppException.conflict("ORDER_CLOSED");
        }
        apply(w, r);
        return toDto(repo.save(w));
    }

    private void apply(WorkshopOrder w, WorkshopRequest r) {
        if (Money.round2(r.depositAmount()).compareTo(Money.round2(r.agreedPrice())) > 0) {
            throw AppException.bad("DEPOSIT_ABOVE_PRICE");
        }
        w.customerName = Text.blankToNull(r.customerName());
        w.customerPhone = Text.blankToNull(r.customerPhone());
        w.description = r.description().trim();
        w.karat = r.karat();
        w.artisanName = r.artisanName().trim();
        w.artisanPhone = Text.blankToNull(r.artisanPhone());
        w.givenWeightG = Money.round3(r.givenWeightG());
        w.labourCost = Money.round2(r.labourCost());
        w.depositAmount = Money.round2(r.depositAmount());
        w.agreedPrice = Money.round2(r.agreedPrice());
        w.dueDate = r.dueDate();
        w.note = Text.blankToNull(r.note());
    }

    @Transactional
    public WorkshopDto setStatus(Long shopId, Long id, WorkshopStatusRequest r) {
        WorkshopOrder w = repo.findByIdAndShopId(id, shopId).orElseThrow(AppException::notFound);
        boolean closed = w.status == Enums.WorkshopStatus.DELIVERED || w.status == Enums.WorkshopStatus.CANCELLED;
        if (closed || r.status() == Enums.WorkshopStatus.SENT) throw AppException.conflict("INVALID_TRANSITION");
        // Livraison seulement après réception de l'or fini (sinon perte/poids jamais enregistrés).
        if (r.status() == Enums.WorkshopStatus.DELIVERED && w.status != Enums.WorkshopStatus.READY) {
            throw AppException.conflict("INVALID_TRANSITION");
        }
        if (r.status() == Enums.WorkshopStatus.READY) {
            if (r.receivedWeightG() == null || r.receivedWeightG().signum() <= 0) throw AppException.bad("WEIGHT_REQUIRED");
            w.receivedWeightG = Money.round3(r.receivedWeightG());
        }
        w.status = r.status();
        return toDto(repo.save(w));
    }
}
