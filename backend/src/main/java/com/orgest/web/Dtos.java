package com.orgest.web;

import com.orgest.domain.Enums;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** DTO d'entrée/sortie : les entités JPA ne sont jamais exposées (A01/A04 : pas de mass assignment). */
public final class Dtos {
    private Dtos() {}

    // ---------- Auth / compte ----------
    public record LoginRequest(@NotBlank @Size(max = 60) String username, @NotBlank @Size(max = 128) String password) {}

    public record MeResponse(Long id, String username, String role, String shopName, String ownerName, String phone,
                             String city, String address, String ice, String receiptFooter, boolean active,
                             LocalDate subscriptionEnd, boolean subscriptionValid, long daysLeft) {}

    public record UpdateProfileRequest(@NotBlank @Size(max = 120) String shopName, @Size(max = 120) String ownerName,
                                       @Size(max = 30) String phone, @Size(max = 80) String city,
                                       @Size(max = 255) String address, @Size(max = 30) String ice,
                                       @Size(max = 255) String receiptFooter) {}

    public record ChangePasswordRequest(@NotBlank @Size(max = 128) String currentPassword,
                                        @NotBlank @Size(min = 8, max = 128) String newPassword) {}

    // ---------- Admin ----------
    public record CreateShopRequest(@NotBlank @Size(max = 120) String shopName, @Size(max = 120) String ownerName,
                                    @Size(max = 30) String phone, @Size(max = 80) String city,
                                    @NotBlank @Pattern(regexp = "^[A-Za-z0-9._-]{3,40}$") String username,
                                    @Size(min = 8, max = 128) String password,
                                    @NotNull @Min(1) @Max(24) Integer months,
                                    @NotNull Enums.PayMethod method,
                                    @NotNull @DecimalMin("0") @DecimalMax("1000000") BigDecimal amount,
                                    @Size(max = 80) String reference) {}

    public record RenewRequest(@NotNull @Min(1) @Max(24) Integer months, @NotNull Enums.PayMethod method,
                               @NotNull @DecimalMin("0") @DecimalMax("1000000") BigDecimal amount,
                               @Size(max = 80) String reference, @Size(max = 255) String note) {}

    public record UpdateShopRequest(@NotBlank @Size(max = 120) String shopName, @Size(max = 120) String ownerName,
                                    @Size(max = 30) String phone, @Size(max = 80) String city) {}

    public record ShopSummary(Long id, String username, String shopName, String ownerName, String phone, String city,
                              boolean active, LocalDate subscriptionEnd, String status, long daysLeft, Instant createdAt) {}

    public record PaymentDto(Long id, BigDecimal amount, String method, int months, String reference, String note,
                             LocalDate periodStart, LocalDate periodEnd, Instant paidAt) {}

    public record ShopDetail(ShopSummary shop, List<PaymentDto> payments) {}

    public record CredentialsResponse(Long id, String username, String password) {}

    public record AdminStats(long active, long expiringSoon, long expired, long suspended, BigDecimal monthRevenue) {}

    // ---------- Prix ----------
    public record PriceIn(@NotNull Integer karat, @NotNull @DecimalMin("0") @DecimalMax("1000000") BigDecimal sellPerGram,
                          @NotNull @DecimalMin("0") @DecimalMax("1000000") BigDecimal buyPerGram) {}

    public record UpdatePricesRequest(@NotEmpty @Size(max = 3) List<@Valid PriceIn> prices) {}

    public record PriceDto(int karat, BigDecimal sellPerGram, BigDecimal buyPerGram, Instant updatedAt) {}

    // ---------- Stock ----------
    public record ItemRequest(@NotBlank @Size(max = 120) String name, @NotBlank @Size(max = 30) String category,
                              @NotNull Integer karat,
                              @NotNull @DecimalMin("0.001") @DecimalMax("10000") BigDecimal weightG,
                              @NotNull @DecimalMin("0") @DecimalMax("100000") BigDecimal makingPerGram,
                              @Size(max = 500) String note) {}

    public record ItemDto(Long id, String ref, String name, String category, int karat, BigDecimal weightG,
                          BigDecimal makingPerGram, String status, boolean hasPhoto, String note, Instant createdAt) {}

    public record PageDto<T>(List<T> content, long total, int page, int size) {}

    // ---------- Achat d'or ----------
    public record BuybackRequest(@Size(max = 120) String customerName, @Size(max = 30) String customerPhone,
                                 @Size(max = 20) String customerCin, @Size(max = 255) String description,
                                 @NotNull Integer karat,
                                 @NotNull @DecimalMin("0.001") @DecimalMax("10000") BigDecimal grossWeightG,
                                 @NotNull @DecimalMin("0") @DecimalMax("99") BigDecimal deductionPct,
                                 @NotNull @DecimalMin("0") @DecimalMax("100000") BigDecimal pricePerGram) {}

    public record BuybackDto(Long id, String number, String customerName, String customerPhone, String customerCin,
                             String description, int karat, BigDecimal grossWeightG, BigDecimal deductionPct,
                             BigDecimal netWeightG, BigDecimal pricePerGram, BigDecimal total, Instant createdAt) {}

    // ---------- Vente / échange ----------
    public record LineIn(Long itemId, @Size(max = 160) String description, Integer karat,
                         @DecimalMin("0.001") @DecimalMax("10000") BigDecimal weightG,
                         @NotNull @DecimalMin("0") @DecimalMax("100000") BigDecimal pricePerGram,
                         @NotNull @DecimalMin("0") @DecimalMax("100000") BigDecimal makingPerGram) {}

    public record SaleRequest(Enums.SaleType type, @Size(max = 120) String customerName,
                              @Size(max = 30) String customerPhone,
                              @NotEmpty @Size(max = 30) List<@Valid LineIn> lines,
                              @Valid BuybackRequest oldGold,
                              @NotNull Enums.PaymentMode paymentMode,
                              @DecimalMin("0") @DecimalMax("1000000000") BigDecimal downPayment,
                              @Min(0) @Max(36) Integer months) {}

    public record LineDto(String description, int karat, BigDecimal weightG, BigDecimal pricePerGram,
                          BigDecimal makingPerGram, BigDecimal lineTotal) {}

    public record InstallmentDto(Long id, int seq, LocalDate dueDate, BigDecimal amount, boolean paid, Instant paidAt,
                                 boolean overdue) {}

    public record SaleDto(Long id, String number, String type, String customerName, String customerPhone,
                          BigDecimal subtotal, BigDecimal tradeInAmount, BigDecimal balance, String paymentMode,
                          BigDecimal downPayment, int months, Instant createdAt, List<LineDto> lines,
                          List<InstallmentDto> installments, BuybackDto buyback) {}

    public record SaleSummary(Long id, String number, String type, String customerName, BigDecimal subtotal,
                              BigDecimal balance, String paymentMode, Instant createdAt) {}

    public record PlanDto(Long saleId, String saleNumber, String customerName, String customerPhone,
                          BigDecimal remaining, BigDecimal paid, LocalDate nextDue, long overdueCount,
                          BigDecimal balance, BigDecimal downPayment,
                          List<InstallmentDto> installments) {}

    // ---------- Atelier / commandes chez le fabricant ----------
    public record WorkshopRequest(@Size(max = 120) String customerName, @Size(max = 30) String customerPhone,
                                  @NotBlank @Size(max = 255) String description, @NotNull Integer karat,
                                  @NotBlank @Size(max = 120) String artisanName, @Size(max = 30) String artisanPhone,
                                  @NotNull @DecimalMin("0") @DecimalMax("10000") BigDecimal givenWeightG,
                                  @NotNull @DecimalMin("0") @DecimalMax("100000000") BigDecimal labourCost,
                                  @NotNull @DecimalMin("0") @DecimalMax("100000000") BigDecimal depositAmount,
                                  @NotNull @DecimalMin("0") @DecimalMax("100000000") BigDecimal agreedPrice,
                                  LocalDate dueDate, @Size(max = 500) String note) {}

    public record WorkshopStatusRequest(@NotNull Enums.WorkshopStatus status,
                                        @DecimalMin("0") @DecimalMax("10000") BigDecimal receivedWeightG) {}

    public record WorkshopDto(Long id, String number, String customerName, String customerPhone, String description,
                              int karat, String artisanName, String artisanPhone, BigDecimal givenWeightG,
                              BigDecimal receivedWeightG, BigDecimal lossG, BigDecimal labourCost,
                              BigDecimal depositAmount, BigDecimal agreedPrice, LocalDate dueDate, String status,
                              String note, Instant createdAt) {}

    // ---------- Tableau de bord / rapports ----------
    public record DashboardDto(BigDecimal salesToday, long salesCountToday, BigDecimal salesMonth,
                               BigDecimal buybackMonth, long stockCount, BigDecimal stockWeightG,
                               BigDecimal stockValue, long overdueInstallments, BigDecimal installmentsOutstanding,
                               long openWorkshop, List<SaleSummary> recentSales, List<PriceDto> prices) {}

    public record DayPoint(LocalDate date, BigDecimal total) {}

    public record ReportDto(LocalDate from, LocalDate to, long salesCount, BigDecimal salesTotal,
                            long exchangeCount, BigDecimal buybackTotal, BigDecimal buybackWeightG,
                            BigDecimal averageTicket, List<DayPoint> byDay) {}

    // ---------- Contenu public : tarifs + blog ----------
    public record SubPlanDto(Long id, int months, BigDecimal price, boolean popular, boolean active) {}

    public record PlanIn(@NotNull @Min(1) @Max(60) Integer months,
                         @NotNull @DecimalMin("0") @DecimalMax("1000000") BigDecimal price,
                         boolean popular, boolean active) {}

    public record PlansRequest(@NotEmpty @Size(max = 12) List<@Valid PlanIn> plans) {}

    public record PostIn(@NotBlank @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$") @Size(min = 3, max = 120) String slug,
                         @NotBlank @Size(max = 160) String title,
                         @Size(max = 300) String excerpt,
                         @NotBlank @Size(max = 60000) String content,
                         @Size(max = 60) String category,
                         @Size(max = 160) String coverAlt,
                         @Size(max = 70) String metaTitle,
                         @Size(max = 170) String metaDescription,
                         @Size(max = 200) String keywords,
                         @NotNull @Min(1) @Max(60) Integer readMinutes,
                         boolean published) {}

    public record PostSummary(Long id, String slug, String title, String excerpt, String category, String cover,
                              String coverAlt, int readMinutes, boolean published, Instant publishedAt, Instant updatedAt) {}

    public record PostDto(Long id, String slug, String title, String excerpt, String content, String category, String cover,
                          String coverAlt, String metaTitle, String metaDescription, String keywords, int readMinutes,
                          boolean published, Instant publishedAt, Instant updatedAt) {}
}
