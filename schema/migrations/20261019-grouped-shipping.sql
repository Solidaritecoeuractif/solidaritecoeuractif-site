-- Additive migration: existing prices and historical orders remain intact.
ALTER TABLE products ADD COLUMN IF NOT EXISTS grouped_shipping jsonb;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS line_total integer;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS shipping_savings_amount integer;
UPDATE products SET grouped_shipping = $config${"enabled": true, "tiers": [{"minQuantity": 2, "savingsAmount": 400}, {"minQuantity": 3, "savingsAmount": 600}], "title": "Faites-en profiter vos proches 💛", "description": "Regroupez vos exemplaires à la même adresse et économisez sur les frais d’envoi :", "footer": "Pour vous, votre famille, vos amis ou votre communauté… les livres sont offerts, seuls les frais d’envoi restent à votre charge."}$config$::jsonb
WHERE id = 'prod_book_365' AND grouped_shipping IS NULL;
