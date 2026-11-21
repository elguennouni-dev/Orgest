ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_role_check;
ALTER TABLE app_user ADD CONSTRAINT app_user_role_check CHECK (role IN ('ADMIN','SHOP','STAFF'));
ALTER TABLE app_user ADD COLUMN owner_id BIGINT REFERENCES app_user(id);
CREATE INDEX ix_user_owner ON app_user (owner_id);
