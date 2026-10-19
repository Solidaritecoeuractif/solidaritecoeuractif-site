"use client";

import { useEffect, useRef, useState } from "react";
import type { GroupedShipping } from "@/lib/types";
import { DEFAULT_GROUPED_SHIPPING, groupedTierLabel } from "@/lib/grouped-shipping";
import { groupedShippingSchema } from "@/lib/validators";
import { euros } from "@/lib/utils";

export default function AdminGroupedShippingFields({ value }: { value?: GroupedShipping }) {
  const [config, setConfig] = useState<GroupedShipping>(() => value ?? { ...DEFAULT_GROUPED_SHIPPING, enabled: false });
  const firstThreshold = useRef<HTMLInputElement>(null);
  const parsed = groupedShippingSchema.safeParse(config);
  const error = parsed.success ? "" : parsed.error.issues[0].message;
  useEffect(() => { firstThreshold.current?.setCustomValidity(config.enabled ? error : ""); }, [config.enabled, error]);

  function setTier(index: number, key: "minQuantity" | "savingsAmount", value: number) {
    setConfig(previous => ({ ...previous, tiers: previous.tiers.map((tier, i) => i === index ? { ...tier, [key]: value } : tier) }));
  }

  return (
    <fieldset className="full" style={{ border: "1px solid #d7dfd8", borderRadius: 16, padding: 20, minWidth: 0 }}>
      <legend style={{ fontWeight: 700, padding: "0 8px" }}>Tarif d’envoi groupé</legend>
      <input type="hidden" name="groupedShipping" value={JSON.stringify(config)} />
      <label style={{ display: "block", marginBottom: 16 }}>
        <input type="checkbox" checked={config.enabled} onChange={event => setConfig({ ...config, enabled: event.target.checked })} />{" "}
        Activer le tarif d’envoi groupé et son annonce
      </label>
      <p>Les économies s’appliquent une seule fois au total de l’envoi, dans toutes les destinations. Le dernier palier atteint remplace les précédents. Les montants de base par destination restent réglables dans les champs ci-dessus.</p>
      <div style={{ display: "grid", gap: 14 }}>
        {config.tiers.map((tier, index) => (
          <div key={index} style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 12 }}>
            <label style={{ flex: "1 1 150px" }}>
              <span>Palier {index + 1} — à partir de (exemplaires)</span>
              <input ref={index === 0 ? firstThreshold : undefined} type="number" min={2} max={50} step={1} required={config.enabled} value={tier.minQuantity || ""} onChange={event => setTier(index, "minQuantity", Number(event.target.value))} />
            </label>
            <label style={{ flex: "1 1 150px" }}>
              <span>Économie totale sur l’envoi (€)</span>
              <input type="number" min="0.01" max="1000" step="0.01" required={config.enabled} value={tier.savingsAmount ? tier.savingsAmount / 100 : ""} onChange={event => setTier(index, "savingsAmount", Math.round(Number(event.target.value) * 100))} />
            </label>
            <button type="button" className="button ghost small" disabled={config.tiers.length <= 1} onClick={() => setConfig({ ...config, tiers: config.tiers.filter((_, i) => i !== index) })}>Retirer ce palier</button>
          </div>
        ))}
        <button type="button" className="button secondary small" disabled={config.tiers.length >= 8 || config.tiers.at(-1)!.minQuantity >= 50} onClick={() => setConfig({ ...config, tiers: [...config.tiers, { minQuantity: config.tiers.at(-1)!.minQuantity + 1, savingsAmount: config.tiers.at(-1)!.savingsAmount }] })}>Ajouter un palier</button>
        {error && config.enabled ? <p role="alert" className="error-note">{error}</p> : null}
        <label><span>Titre de l’annonce</span><input value={config.title} maxLength={160} required={config.enabled} onChange={event => setConfig({ ...config, title: event.target.value })} /></label>
        <label><span>Texte d’introduction</span><textarea value={config.description} maxLength={600} onChange={event => setConfig({ ...config, description: event.target.value })} /></label>
        <label><span>Texte sous les paliers</span><textarea value={config.footer} maxLength={600} onChange={event => setConfig({ ...config, footer: event.target.value })} /></label>
        <div style={{ background: "#f3f7f2", padding: 16, borderRadius: 12 }} aria-live="polite">
          <strong>Aperçu de l’annonce {config.enabled ? "" : "(désactivée)"}</strong>
          <p><strong>{config.title}</strong></p><p>{config.description}</p>
          {config.tiers.map((tier, index) => <p key={index}>{groupedTierLabel(config.tiers, index)} : <strong>{euros(tier.savingsAmount)} d’économie</strong></p>)}
          <p>{config.footer}</p>
        </div>
      </div>
    </fieldset>
  );
}
