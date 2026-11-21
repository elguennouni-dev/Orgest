ALTER TABLE sale ADD COLUMN client_ref VARCHAR(40);
CREATE UNIQUE INDEX ux_sale_client_ref ON sale (shop_id, client_ref) WHERE client_ref IS NOT NULL;
