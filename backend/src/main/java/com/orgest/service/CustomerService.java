package com.orgest.service;

import com.orgest.common.AppException;
import com.orgest.common.Money;
import com.orgest.common.Text;
import com.orgest.domain.Customer;
import com.orgest.domain.CustomerPayment;
import com.orgest.domain.Enums;
import com.orgest.domain.Sale;
import com.orgest.repo.CustomerPaymentRepository;
import com.orgest.repo.CustomerRepository;
import com.orgest.repo.SaleRepository;
import com.orgest.web.Dtos.*;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Carnet clients + crédit : une vente à crédit laisse un « reste dû » que les règlements soldent, du plus ancien au plus récent. */
@Service
public class CustomerService {
    private final CustomerRepository customers;
    private final CustomerPaymentRepository payments;
    private final SaleRepository sales;
    private final AuditService audit;

    public CustomerService(CustomerRepository customers, CustomerPaymentRepository payments, SaleRepository sales, AuditService audit) {
        this.customers = customers;
        this.payments = payments;
        this.sales = sales;
        this.audit = audit;
    }

    /** Retrouve (téléphone, sinon nom exact) ou crée le client d'une vente. Null si aucun nom. */
    @Transactional
    public Customer resolve(Long shopId, String name, String phone) {
        String n = Text.blankToNull(name);
        if (n == null) return null;
        String ph = Text.blankToNull(phone);
        List<Customer> found = ph != null ? customers.findByShopIdAndPhone(shopId, ph) : customers.findByShopIdAndNameIgnoreCase(shopId, n);
        if (!found.isEmpty()) return found.get(0);
        Customer c = new Customer();
        c.shopId = shopId;
        c.name = Text.clean(n, 120);
        c.phone = ph;
        return customers.save(c);
    }

    private static CustomerDto toDto(Customer c, BigDecimal due) {
        return new CustomerDto(c.id, c.name, c.phone, c.note, due == null ? BigDecimal.ZERO : Money.round2(due), c.createdAt);
    }

    @Transactional(readOnly = true)
    public PageDto<CustomerDto> list(Long shopId, String q, boolean debtOnly, int page, int size) {
        Page<Customer> p = customers.search(shopId, q == null ? "" : q.trim(), debtOnly,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
        Map<Long, BigDecimal> due = dueMap(shopId, p.getContent().stream().map(c -> c.id).toList());
        return new PageDto<>(p.getContent().stream().map(c -> toDto(c, due.get(c.id))).toList(),
                p.getTotalElements(), p.getNumber(), p.getSize());
    }

    private Map<Long, BigDecimal> dueMap(Long shopId, List<Long> ids) {
        Map<Long, BigDecimal> m = new HashMap<>();
        if (ids.isEmpty()) return m;
        for (Object[] r : sales.creditByCustomer(shopId, ids)) m.put((Long) r[0], (BigDecimal) r[1]);
        return m;
    }

    @Transactional(readOnly = true)
    public CustomerDetail detail(Long shopId, Long id) {
        Customer c = customers.findByIdAndShopId(id, shopId).orElseThrow(AppException::notFound);
        List<SaleSummary> list = sales.findByShopIdAndCustomerIdOrderByCreatedAtDesc(shopId, id, PageRequest.of(0, 50))
                .getContent().stream().map(SalesService::summary).toList();
        List<CustomerPayDto> pays = payments.findTop100ByShopIdAndCustomerIdOrderByCreatedAtDesc(shopId, id).stream()
                .map(p -> new CustomerPayDto(p.id, p.saleId, p.amount, p.method.name(), p.note, p.createdAt)).toList();
        return new CustomerDetail(toDto(c, dueMap(shopId, List.of(id)).get(id)), list, pays);
    }

    @Transactional
    public CustomerDto create(Long shopId, CustomerRequest r) {
        Customer c = new Customer();
        c.shopId = shopId;
        c.name = r.name().trim();
        c.phone = Text.blankToNull(r.phone());
        c.note = Text.blankToNull(r.note());
        customers.save(c);
        audit.log(shopId, null, "CUSTOMER_CREATE", c.name, null);
        return toDto(c, null);
    }

    @Transactional
    public CustomerDto update(Long shopId, Long id, CustomerRequest r) {
        Customer c = customers.findByIdAndShopId(id, shopId).orElseThrow(AppException::notFound);
        c.name = r.name().trim();
        c.phone = Text.blankToNull(r.phone());
        c.note = Text.blankToNull(r.note());
        customers.save(c);
        return toDto(c, dueMap(shopId, List.of(id)).get(id));
    }

    /** Encaisse un règlement : réparti sur les crédits ouverts, du plus ancien au plus récent. Refuse un trop-perçu. */
    @Transactional
    public CustomerDetail pay(Long shopId, Long id, CustomerPayRequest r) {
        Customer c = customers.findByIdAndShopId(id, shopId).orElseThrow(AppException::notFound);
        Enums.SalePay method = r.method() == null ? Enums.SalePay.CASH : r.method();
        if (method == Enums.SalePay.CREDIT) throw AppException.bad("INVALID_METHOD");
        BigDecimal left = Money.round2(r.amount());
        List<Sale> open = sales.findByShopIdAndCustomerIdAndCreditDueGreaterThanOrderByCreatedAtAsc(shopId, id, BigDecimal.ZERO);
        BigDecimal due = open.stream().map(s -> s.creditDue).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (left.compareTo(due) > 0) throw AppException.bad("OVERPAYMENT");
        for (Sale s : open) {
            if (left.signum() == 0) break;
            BigDecimal part = left.min(s.creditDue);
            s.creditDue = s.creditDue.subtract(part);
            left = left.subtract(part);
            CustomerPayment p = new CustomerPayment();
            p.shopId = shopId;
            p.customerId = id;
            p.saleId = s.id;
            p.amount = part;
            p.method = method;
            p.note = Text.blankToNull(r.note());
            payments.save(p);
        }
        sales.saveAll(open);
        audit.log(shopId, null, "CUSTOMER_PAYMENT", c.name + " " + r.amount(), null);
        return detail(shopId, id);
    }
}
