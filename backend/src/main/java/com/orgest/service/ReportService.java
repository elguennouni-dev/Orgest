package com.orgest.service;

import com.orgest.common.AppException;
import com.orgest.common.Money;
import com.orgest.domain.*;
import com.orgest.repo.*;
import com.orgest.web.Dtos.*;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReportService {
    private static final ZoneId Z = Money.ZONE;
    private final SaleRepository sales;
    private final BuybackRepository buybacks;
    private final ItemRepository items;
    private final InstallmentRepository installments;
    private final WorkshopRepository workshop;
    private final ShopService shop;

    public ReportService(SaleRepository sales, BuybackRepository buybacks, ItemRepository items,
                         InstallmentRepository installments, WorkshopRepository workshop, ShopService shop) {
        this.sales = sales;
        this.buybacks = buybacks;
        this.items = items;
        this.installments = installments;
        this.workshop = workshop;
        this.shop = shop;
    }

    @Transactional(readOnly = true)
    public DashboardDto dashboard(Long shopId) {
        LocalDate today = Money.today();
        Instant t0 = Money.startOf(today), t1 = Money.startOf(today.plusDays(1));
        Instant m0 = Money.startOf(today.withDayOfMonth(1)), m1 = t1;
        List<PriceDto> prices = shop.prices(shopId);
        Map<Integer, BigDecimal> sell = new HashMap<>();
        prices.forEach(p -> sell.put(p.karat(), p.sellPerGram()));
        BigDecimal value = BigDecimal.ZERO;
        for (Item i : items.inStock(shopId, Enums.ItemStatus.IN_STOCK)) {
            value = value.add(i.weightG.multiply(sell.getOrDefault(i.karat, BigDecimal.ZERO)));
        }
        List<SaleSummary> recent = sales.findByShopIdOrderByCreatedAtDesc(shopId, PageRequest.of(0, 5))
                .getContent().stream().map(SalesService::summary).toList();
        return new DashboardDto(
                sales.totalBetween(shopId, t0, t1), sales.countBetween(shopId, t0, t1),
                sales.totalBetween(shopId, m0, m1), buybacks.totalBetween(shopId, m0, m1),
                items.countByShopIdAndStatus(shopId, Enums.ItemStatus.IN_STOCK),
                items.stockWeight(shopId, Enums.ItemStatus.IN_STOCK), Money.round2(value),
                installments.countByShopIdAndPaidFalseAndDueDateBefore(shopId, today),
                installments.outstanding(shopId),
                workshop.countByShopIdAndStatusIn(shopId, List.of(Enums.WorkshopStatus.SENT, Enums.WorkshopStatus.READY)),
                recent, prices);
    }

    private static void checkRange(LocalDate from, LocalDate to) {
        if (from == null || to == null || to.isBefore(from) || ChronoUnit.DAYS.between(from, to) > 366) {
            throw AppException.bad("INVALID_RANGE");
        }
    }

    @Transactional(readOnly = true)
    public ReportDto report(Long shopId, LocalDate from, LocalDate to) {
        checkRange(from, to);
        Instant a = Money.startOf(from), b = Money.startOf(to.plusDays(1));
        List<Sale> list = sales.between(shopId, a, b);
        BigDecimal total = BigDecimal.ZERO;
        TreeMap<LocalDate, BigDecimal> byDay = new TreeMap<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) byDay.put(d, BigDecimal.ZERO);
        for (Sale s : list) {
            total = total.add(s.subtotal);
            byDay.merge(s.createdAt.atZone(Z).toLocalDate(), s.subtotal, BigDecimal::add);
        }
        BigDecimal avg = list.isEmpty() ? BigDecimal.ZERO : total.divide(BigDecimal.valueOf(list.size()), 2, RoundingMode.HALF_UP);
        return new ReportDto(from, to, list.size(), Money.round2(total),
                sales.exchangesBetween(shopId, Enums.SaleType.EXCHANGE, a, b),
                buybacks.totalBetween(shopId, a, b), buybacks.weightBetween(shopId, a, b), avg,
                byDay.entrySet().stream().map(e -> new DayPoint(e.getKey(), e.getValue())).toList());
    }

    // ---------- Export Excel (.xlsx) ----------
    /** Protège contre l'injection de formules (CSV/Excel injection) : préfixe les valeurs dangereuses. */
    static String safe(String v) {
        if (v == null) return "";
        if (!v.isEmpty() && "=+-@\t\r".indexOf(v.charAt(0)) >= 0) return "'" + v;
        return v;
    }

    @Transactional(readOnly = true)
    public byte[] exportSales(Long shopId, LocalDate from, LocalDate to) {
        checkRange(from, to);
        List<Sale> list = sales.between(shopId, Money.startOf(from), Money.startOf(to.plusDays(1)));
        return workbook("Ventes",
                List.of("N°", "Date", "Type", "Client", "Téléphone", "Total", "Reprise or", "Solde", "Paiement"),
                list.stream().map(s -> new Object[]{s.number, s.createdAt.atZone(Z).toLocalDateTime().toString().replace('T', ' '),
                        s.type.name(), s.customerName, s.customerPhone, s.subtotal, s.tradeInAmount, s.balance,
                        s.paymentMode.name()}).toList());
    }

    @Transactional(readOnly = true)
    public byte[] exportItems(Long shopId) {
        return workbook("Stock",
                List.of("Réf", "Désignation", "Catégorie", "Carat", "Poids (g)", "Façon/g", "Statut", "Date"),
                items.allForExport(shopId).stream().map(i -> new Object[]{i.ref, i.name, i.category, i.karat, i.weightG,
                        i.makingPerGram, i.status.name(), i.createdAt.atZone(Z).toLocalDate().toString()}).toList());
    }

    @Transactional(readOnly = true)
    public byte[] exportBuybacks(Long shopId, LocalDate from, LocalDate to) {
        checkRange(from, to);
        Instant a = Money.startOf(from), b = Money.startOf(to.plusDays(1));
        List<Buyback> list = buybacks.between(shopId, a, b);
        return workbook("Achats or",
                List.of("N°", "Date", "Client", "Carat", "Poids brut (g)", "Déduction %", "Poids net (g)", "Prix/g", "Total"),
                list.stream()
                        .map(x -> new Object[]{x.number, x.createdAt.atZone(Z).toLocalDate().toString(), x.customerName,
                                x.karat, x.grossWeightG, x.deductionPct, x.netWeightG, x.pricePerGram, x.total}).toList());
    }

    private byte[] workbook(String sheetName, List<String> headers, List<Object[]> rows) {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sh = wb.createSheet(sheetName);
            CellStyle bold = wb.createCellStyle();
            Font f = wb.createFont();
            f.setBold(true);
            bold.setFont(f);
            Row h = sh.createRow(0);
            for (int c = 0; c < headers.size(); c++) {
                Cell cell = h.createCell(c);
                cell.setCellValue(headers.get(c));
                cell.setCellStyle(bold);
            }
            int r = 1;
            for (Object[] row : rows) {
                Row x = sh.createRow(r++);
                for (int c = 0; c < row.length; c++) {
                    Cell cell = x.createCell(c);
                    Object v = row[c];
                    if (v instanceof BigDecimal bd) cell.setCellValue(bd.doubleValue());
                    else if (v instanceof Number n) cell.setCellValue(n.doubleValue());
                    else cell.setCellValue(safe(v == null ? "" : v.toString()));
                }
            }
            for (int c = 0; c < headers.size(); c++) sh.setColumnWidth(c, 18 * 256);
            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Export Excel impossible", e);
        }
    }
}
