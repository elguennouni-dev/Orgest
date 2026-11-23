UPDATE installment AS i
SET due_date = DATE '2026-11-10'
FROM sale AS s, app_user AS u
WHERE i.id = 10
  AND i.shop_id = 3
  AND u.id = i.shop_id
  AND u.username = 'demo'
  AND s.id = i.sale_id
  AND s.shop_id = i.shop_id
  AND s.number = 'V-00005'
  AND s.customer_name = 'Omar Fassi'
  AND i.seq = 1
  AND i.amount = 2086.40
  AND i.due_date = DATE '2026-12-18'
  AND i.paid = false;
