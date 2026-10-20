-- Update only the old fee wording for the free book, preserving prices,
-- thresholds and any other text the administrator has personalized.
UPDATE products
SET
  subtitle = replace(replace(subtitle,
    'Livre GRATUIT–', 'Livre GRATUIT –'),
    'frais de livraison', 'frais de traitement et d’expédition'),
  short_description = replace(short_description,
    'Les frais demandés correspondent à la livraison du livre.',
    'Le livre vous est offert. Votre participation couvre le traitement de votre demande et l’expédition jusqu’à votre adresse.'),
  long_description = replace(long_description,
    'Le montant demandé correspond aux frais liés à la livraison du livre, à son emballage ainsi qu’au stockage avant expédition.',
    'Le livre vous est offert. Votre participation couvre le traitement de votre demande et l’expédition jusqu’à votre adresse.'),
  grouped_shipping = CASE WHEN grouped_shipping IS NOT NULL THEN
    jsonb_set(
      jsonb_set(grouped_shipping, '{description}',
        to_jsonb(replace(grouped_shipping->>'description', 'frais d’envoi', 'frais de traitement et d’expédition'))),
      '{footer}',
      to_jsonb(replace(grouped_shipping->>'footer', 'frais d’envoi', 'frais de traitement et d’expédition')))
    ELSE grouped_shipping END,
  updated_at = now()
WHERE id = 'prod_book_365';
