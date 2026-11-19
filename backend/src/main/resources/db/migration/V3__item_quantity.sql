-- Quantité par article : une vente diminue le stock, l'article n'est jamais supprimé (il reste à 0 = épuisé).
ALTER TABLE item ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0);
UPDATE item SET quantity = 0 WHERE status <> 'IN_STOCK';

ALTER TABLE sale_line ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1);
