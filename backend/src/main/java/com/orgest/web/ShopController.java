package com.orgest.web;

import com.orgest.common.AppException;
import com.orgest.common.Money;
import com.orgest.domain.AppUser;
import com.orgest.domain.Enums;
import com.orgest.security.CurrentUser;
import com.orgest.service.*;
import com.orgest.web.Dtos.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/** Toutes les routes /api/shop/** exigent le rôle SHOP ; chaque requête est filtrée par l'id du commerçant connecté. */
@RestController
@RequestMapping("/api/shop")
public class ShopController {
    private static final MediaType XLSX =
            MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final ShopService shop;
    private final SalesService sales;
    private final WorkshopService workshop;
    private final ReportService reports;
    private final AuthController auth;
    private final com.orgest.security.JwtService jwt;

    public ShopController(ShopService shop, SalesService sales, WorkshopService workshop, ReportService reports,
                          AuthController auth, com.orgest.security.JwtService jwt) {
        this.shop = shop;
        this.sales = sales;
        this.workshop = workshop;
        this.reports = reports;
        this.auth = auth;
        this.jwt = jwt;
    }

    private static Long me() { return CurrentUser.shopId(); }

    // ----- Compte (accessible même si l'abonnement est expiré) -----
    @PutMapping("/account/profile")
    public MeResponse profile(@Valid @RequestBody UpdateProfileRequest r) { return shop.updateProfile(me(), r); }

    @PostMapping("/account/password")
    public MeResponse password(@Valid @RequestBody ChangePasswordRequest r, HttpServletRequest req, HttpServletResponse res) {
        AppUser u = shop.changePassword(me(), r, req.getRemoteAddr());
        auth.setCookie(res, jwt.issue(u), jwt.ttl());   // nouveau jeton, l'ancien est invalidé
        return AuthService.toMe(u);
    }

    // ----- Tableau de bord / rapports -----
    @GetMapping("/dashboard")
    public DashboardDto dashboard() { return reports.dashboard(me()); }

    @GetMapping("/reports")
    public ReportDto report(@RequestParam LocalDate from, @RequestParam LocalDate to) {
        return reports.report(me(), from, to);
    }

    @GetMapping("/export/sales.xlsx")
    public ResponseEntity<byte[]> exportSales(@RequestParam LocalDate from, @RequestParam LocalDate to) {
        return xlsx("ventes.xlsx", reports.exportSales(me(), from, to));
    }

    @GetMapping("/export/items.xlsx")
    public ResponseEntity<byte[]> exportItems() { return xlsx("stock.xlsx", reports.exportItems(me())); }

    @GetMapping("/export/buybacks.xlsx")
    public ResponseEntity<byte[]> exportBuybacks(@RequestParam LocalDate from, @RequestParam LocalDate to) {
        return xlsx("achats-or.xlsx", reports.exportBuybacks(me(), from, to));
    }

    private ResponseEntity<byte[]> xlsx(String name, byte[] body) {
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(name).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(body);
    }

    // ----- Prix -----
    @GetMapping("/prices")
    public List<PriceDto> prices() { return shop.prices(me()); }

    @PutMapping("/prices")
    public List<PriceDto> updatePrices(@Valid @RequestBody UpdatePricesRequest r) { return shop.updatePrices(me(), r); }

    // ----- Stock -----
    @GetMapping("/items")
    public PageDto<ItemDto> items(@RequestParam(defaultValue = "IN_STOCK") String status,
                                  @RequestParam(defaultValue = "") String q,
                                  @RequestParam(defaultValue = "0") int karat,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "24") int size) {
        Enums.ItemStatus st = "ALL".equalsIgnoreCase(status) ? null : parseStatus(status);
        return shop.listItems(me(), st, q, karat, page, size);
    }

    private static Enums.ItemStatus parseStatus(String s) {
        try { return Enums.ItemStatus.valueOf(s.toUpperCase()); } catch (IllegalArgumentException e) { throw AppException.bad("INVALID_STATUS"); }
    }

    @GetMapping("/items/{id}")
    public ItemDto item(@PathVariable Long id) { return shop.getItem(me(), id); }

    @PostMapping("/items")
    @ResponseStatus(HttpStatus.CREATED)
    public ItemDto createItem(@Valid @RequestBody ItemRequest r) { return shop.createItem(me(), r); }

    @PutMapping("/items/{id}")
    public ItemDto updateItem(@PathVariable Long id, @Valid @RequestBody ItemRequest r) {
        return shop.updateItem(me(), id, r);
    }

    @DeleteMapping("/items/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteItem(@PathVariable Long id) { shop.deleteItem(me(), id); }

    @PostMapping(value = "/items/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ItemDto uploadPhoto(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return shop.setPhoto(me(), id, file);
    }

    @GetMapping("/items/{id}/photo")
    public ResponseEntity<Resource> photo(@PathVariable Long id) throws IOException {
        Path p = shop.photoPath(me(), id);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600")
                .contentLength(Files.size(p))
                .body(new FileSystemResource(p));
    }

    // ----- Logo (écriture : commerçant ; lecture : commerçant + employés pour les reçus) -----
    @PostMapping(value = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public MeResponse uploadLogo(@RequestParam("file") MultipartFile file) { return shop.setLogo(me(), file); }

    @DeleteMapping("/logo")
    public MeResponse removeLogo() { return shop.removeLogo(me()); }

    @GetMapping("/logo")
    public ResponseEntity<Resource> logo() throws IOException {
        Path p = shop.logoPath(me());
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=600")
                .contentLength(Files.size(p))
                .body(new FileSystemResource(p));
    }

    // ----- Ventes / échanges -----
    @PostMapping("/sales")
    @ResponseStatus(HttpStatus.CREATED)
    public SaleDto createSale(@Valid @RequestBody SaleRequest r) { return sales.createSale(me(), r); }

    @GetMapping("/sales")
    public PageDto<SaleSummary> listSales(@RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "20") int size) {
        return sales.listSales(me(), page, size);
    }

    @GetMapping("/sales/{id}")
    public SaleDto sale(@PathVariable Long id) { return sales.getSale(me(), id); }

    // ----- Achat d'or ancien -----
    @PostMapping("/buybacks")
    @ResponseStatus(HttpStatus.CREATED)
    public BuybackDto createBuyback(@Valid @RequestBody BuybackRequest r) { return sales.createBuyback(me(), r); }

    @GetMapping("/buybacks")
    public PageDto<BuybackDto> buybacks(@RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "20") int size) {
        return sales.listBuybacks(me(), page, size);
    }

    @GetMapping("/buybacks/{id}")
    public BuybackDto buyback(@PathVariable Long id) { return sales.getBuyback(me(), id); }

    // ----- Échéances -----
    @GetMapping("/installments")
    public List<PlanDto> plans() { return sales.plans(me()); }

    @PostMapping("/installments/{id}/pay")
    public InstallmentDto pay(@PathVariable Long id) { return sales.payInstallment(me(), id); }

    // ----- Atelier -----
    @GetMapping("/workshop")
    public List<WorkshopDto> workshopList() { return workshop.list(me()); }

    @GetMapping("/workshop/{id}")
    public WorkshopDto workshopGet(@PathVariable Long id) { return workshop.get(me(), id); }

    @PostMapping("/workshop")
    @ResponseStatus(HttpStatus.CREATED)
    public WorkshopDto workshopCreate(@Valid @RequestBody WorkshopRequest r) { return workshop.create(me(), r); }

    @PutMapping("/workshop/{id}")
    public WorkshopDto workshopUpdate(@PathVariable Long id, @Valid @RequestBody WorkshopRequest r) {
        return workshop.update(me(), id, r);
    }

    @PostMapping("/workshop/{id}/status")
    public WorkshopDto workshopStatus(@PathVariable Long id, @Valid @RequestBody WorkshopStatusRequest r) {
        return workshop.setStatus(me(), id, r);
    }
}
