-- OPTIONAL additive migration. It starts OFF and changes no orders, prices or payments.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE IF NOT EXISTS sca_publication_controls (
  feature_key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sca_feature_nonempty CHECK (length(feature_key) BETWEEN 1 AND 100)
);
INSERT INTO sca_publication_controls (feature_key,enabled)
VALUES ('sevlogos_365_digital_discovery',false)
ON CONFLICT (feature_key) DO NOTHING;
COMMIT;
