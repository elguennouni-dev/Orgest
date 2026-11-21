-- « karat » devient le titre du métal : 18/21/24 = or (carats), 800/925/999 = argent (millièmes).
ALTER TABLE gold_price DROP CONSTRAINT IF EXISTS gold_price_karat_check;
ALTER TABLE gold_price ADD CONSTRAINT gold_price_karat_check CHECK (karat IN (18,21,24,800,925,999));
ALTER TABLE item DROP CONSTRAINT IF EXISTS item_karat_check;
ALTER TABLE item ADD CONSTRAINT item_karat_check CHECK (karat IN (18,21,24,800,925,999));
ALTER TABLE buyback DROP CONSTRAINT IF EXISTS buyback_karat_check;
ALTER TABLE buyback ADD CONSTRAINT buyback_karat_check CHECK (karat IN (18,21,24,800,925,999));
ALTER TABLE workshop_order DROP CONSTRAINT IF EXISTS workshop_order_karat_check;
ALTER TABLE workshop_order ADD CONSTRAINT workshop_order_karat_check CHECK (karat IN (18,21,24,800,925,999));
