import type { Product } from "@/lib/types";
import { activeGroupedShipping, groupedShippingSavings, groupedTierLabel } from "@/lib/grouped-shipping";
import { euros } from "@/lib/utils";

export function GroupedShippingOffer({ product, quantity, compact = false }: { product: Product; quantity: number; compact?: boolean }) {
  const config = activeGroupedShipping(product);
  if (!config) return null;
  const saving = groupedShippingSavings(product, quantity);
  if (compact) return (
    <p className="grouped-shipping-status" role="status">
      {saving > 0
        ? `Envoi groupé : ${euros(saving)} d’économie sur vos frais d’envoi.`
        : `Dès ${config.tiers[0].minQuantity} exemplaires à la même adresse, profitez du tarif d’envoi groupé.`}
    </p>
  );
  return (
    <section className="grouped-shipping-offer" aria-label="Tarif d’envoi groupé">
      <h3>{config.title}</h3>
      <p>{config.description}</p>
      <div className="grouped-shipping-tiers">
        {config.tiers.map((tier, index) => (
          <div key={tier.minQuantity} className={quantity >= tier.minQuantity && (!config.tiers[index + 1] || quantity < config.tiers[index + 1].minQuantity) ? "grouped-tier is-current" : "grouped-tier"}>
            <span>{groupedTierLabel(config.tiers, index)}</span>
            <strong>{euros(tier.savingsAmount)} d’économie</strong>
          </div>
        ))}
      </div>
      <p className="grouped-shipping-footer">{config.footer}</p>
    </section>
  );
}
