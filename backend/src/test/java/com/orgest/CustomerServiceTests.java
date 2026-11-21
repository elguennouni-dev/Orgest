package com.orgest;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.orgest.common.AppException;
import com.orgest.domain.Customer;
import com.orgest.domain.CustomerPayment;
import com.orgest.domain.Sale;
import com.orgest.repo.CustomerPaymentRepository;
import com.orgest.repo.CustomerRepository;
import com.orgest.repo.SaleRepository;
import com.orgest.service.AuditService;
import com.orgest.service.CustomerService;
import com.orgest.web.Dtos.CustomerPayRequest;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;

class CustomerServiceTests {
    private static final long SHOP = 3L, CUST = 11L;
    private CustomerRepository customers;
    private CustomerPaymentRepository payments;
    private SaleRepository sales;
    private CustomerService svc;
    private Sale older, newer;
    private final List<CustomerPayment> saved = new ArrayList<>();

    private static BigDecimal d(String s) { return new BigDecimal(s); }

    private static Sale sale(long id, String due) {
        Sale s = new Sale(); s.id = id; s.shopId = SHOP; s.customerId = CUST; s.creditDue = d(due); return s;
    }

    @BeforeEach
    void setUp() {
        customers = mock(CustomerRepository.class);
        payments = mock(CustomerPaymentRepository.class);
        sales = mock(SaleRepository.class);
        Customer c = new Customer(); c.id = CUST; c.shopId = SHOP; c.name = "Ali";
        when(customers.findByIdAndShopId(CUST, SHOP)).thenReturn(Optional.of(c));
        older = sale(1, "300.00"); newer = sale(2, "500.00");
        when(sales.findByShopIdAndCustomerIdAndCreditDueGreaterThanOrderByCreatedAtAsc(eq(SHOP), eq(CUST), any())).thenReturn(List.of(older, newer));
        when(payments.save(any(CustomerPayment.class))).thenAnswer(i -> { saved.add(i.getArgument(0)); return i.getArgument(0); });
        when(payments.findTop100ByShopIdAndCustomerIdOrderByCreatedAtDesc(SHOP, CUST)).thenReturn(List.of());
        when(sales.findByShopIdAndCustomerIdOrderByCreatedAtDesc(eq(SHOP), eq(CUST), any())).thenReturn(new PageImpl<>(List.of()));
        svc = new CustomerService(customers, payments, sales, mock(AuditService.class));
    }

    @Test
    void paymentSettlesOldestCreditFirst() {
        svc.pay(SHOP, CUST, new CustomerPayRequest(d("400"), null, null));
        assertEquals(0, older.creditDue.compareTo(BigDecimal.ZERO));
        assertEquals(0, newer.creditDue.compareTo(d("400.00")));
        assertEquals(2, saved.size());
        assertEquals(d("300.00"), saved.get(0).amount);
        assertEquals(d("100.00"), saved.get(1).amount);
    }

    @Test
    void overpaymentAndCreditMethodAreRejected() {
        assertEquals("OVERPAYMENT", assertThrows(AppException.class, () -> svc.pay(SHOP, CUST, new CustomerPayRequest(d("800.01"), null, null))).code());
        assertEquals("INVALID_METHOD", assertThrows(AppException.class, () -> svc.pay(SHOP, CUST,
                new CustomerPayRequest(d("10"), com.orgest.domain.Enums.SalePay.CREDIT, null))).code());
        assertTrue(saved.isEmpty());
    }
}
