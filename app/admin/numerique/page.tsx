import Link from "next/link";
import { readDigitalVisibility } from "@/lib/sevlogos-publication";

export const dynamic = "force-dynamic";
export const metadata = { title: "Visibilité numérique — Administration" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const [setting, query] = await Promise.all([
    readDigitalVisibility(), searchParams,
  ]);
  return (
    <section className="panel">
      <p className="eyebrow">RÉGLAGES PRIVÉS</p>
      <h1>Visibilité du livre numérique</h1>
      <p>Cette option concerne uniquement la fiche du livre papier
        « 365 jours avec le Seigneur Jésus-Christ ». Aucun achat
        ni paiement numérique n'est ajouté à Solidarité Cœur Actif.</p>
      <p role="status" style={{fontWeight:700}}>
        État : {setting.ready && setting.enabled
          ? "VERSION NUMÉRIQUE VISIBLE"
          : "VERSION NUMÉRIQUE MASQUÉE"}
      </p>
      {query.updated === "1" && (
        <p role="status">Le choix de publication a été enregistré.</p>
      )}
      {query.error && (
        <p role="alert" style={{color:"#9f1d1d"}}>
          Le réglage n'a pas pu être enregistré. Vérifiez la configuration.
        </p>
      )}
      {!setting.ready ? (
        <p>Activation indisponible pour le moment : la migration
          technique doit être installée et contrôlée.
          Aucun lien numérique ne s'affiche au public.</p>
      ) : setting.enabled ? (
        <form method="post" action="/api/admin/sevlogos-visibilite"
          className="form-grid">
          <input type="hidden" name="visibility" value="disable" />
          <p className="full">Vous pouvez retirer le lien sans toucher
            aux commandes du livre papier.</p>
          <button className="button secondary" type="submit">
            Masquer la version numérique
          </button>
        </form>
      ) : (
        <form method="post" action="/api/admin/sevlogos-visibilite"
          className="form-grid">
          <input type="hidden" name="visibility" value="enable" />
          <p className="full">La version numérique restera masquée
            tant que vous ne déciderez pas expressément de l'activer.</p>
          <label className="full">
            <span>Pour l'activer plus tard, saisissez ACTIVER :</span>
            <input name="confirmation" required autoComplete="off"
              placeholder="ACTIVER" />
          </label>
          <button className="button primary" type="submit">
            Activer manuellement le lien numérique
          </button>
        </form>
      )}
      <p style={{marginTop:24}}>
        <Link className="button secondary small" href="/admin/products">
          Retour aux livres papier
        </Link>
      </p>
    </section>
  );
}
