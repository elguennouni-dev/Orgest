package com.orgest.domain;

public final class Enums {
    private Enums() {}
    public enum Role { ADMIN, SHOP }
    public enum ItemStatus { IN_STOCK, SOLD, WORKSHOP }
    public enum SaleType { SALE, EXCHANGE }
    public enum PaymentMode { CASH, INSTALLMENT }
    /** Moyen de règlement encaissé sur une vente (distinct des paiements d'abonnement {@link PayMethod}). */
    public enum SalePay { CASH, CHEQUE, CARD, TRANSFER }
    public enum PayMethod { WAFACASH, VIREMENT, CASHPLUS, CASH }
    public enum WorkshopStatus { SENT, READY, DELIVERED, CANCELLED }
}
