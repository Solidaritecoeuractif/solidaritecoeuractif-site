"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LaPosteIssue, LaPostePreview } from "@/lib/laposte-export";

type Summary = { count: number; preview: LaPostePreview[]; issues: LaPosteIssue[]; customs: boolean; mixed: boolean; error?: string };
type LaPosteExportProps = {
  references: string[];
  children: (open: (trigger: HTMLElement) => void, busy: boolean) => ReactNode;
};

// Le parent fournit le menu d'export ; ce composant conserve le contrôle et le téléchargement.
export default function LaPosteExportButton({ references, children }: LaPosteExportProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [result, setResult] = useState<Summary | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [acknowledgeShipped, setAcknowledgeShipped] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = dialog.current;
    const close = () => { if (!busy) trigger.current?.focus(); };
    el?.addEventListener("close", close);
    return () => el?.removeEventListener("close", close);
  }, [busy]);
  async function preview(refs: string[]) {
    setBusy(true); setMessage(""); setResult(null); setAcknowledgeShipped(false);
    try {
      const res = await fetch("/api/orders/export/laposte", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ references: refs, mode: "preview" }), cache: "no-store" });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || "Contrôle impossible."); if (data.preview) setResult(data); return; }
      setResult(data);
    } catch { setMessage("Connexion interrompue. Aucun fichier n'a été exporté."); }
    finally { setBusy(false); }
  }
  function open(source: HTMLElement) {
    if (busy || references.length === 0 || dialog.current?.open) return;
    trigger.current = source;
    const refs = Array.from(new Set(references));
    setSelection(refs);
    dialog.current?.showModal();
    void preview(refs);
  }
  async function download() {
    if (!result || result.issues.length || busy) return;
    setBusy(true); setMessage("");
    try {
      const res = await fetch("/api/orders/export/laposte", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ references: selection, mode: "xlsx", acknowledgeShipped }), cache: "no-store" });
      if (!res.ok) { const data = await res.json(); setMessage(data.error || "Export impossible."); if (data.preview) setResult(data); return; }
      const blob = await res.blob();
      const name = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] || "SCA_LaPoste.xlsx";
      const url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setMessage("Fichier téléchargé. Chargez-le dans l'Assistant v1.16. Aucune commande n'a été modifiée et aucun affranchissement n'a été créé.");
    } catch { setMessage("Téléchargement interrompu. Réessayez ; aucun paiement n'a été déclenché."); }
    finally { setBusy(false); }
  }
  const alreadyShipped = result?.preview.some(p => p.alreadyShipped);
  return <>
    {children(open, busy)}
    <dialog ref={dialog} aria-labelledby="sca-laposte-title" onCancel={e => { if (busy) e.preventDefault(); }} style={{ width: "min(1200px, 94vw)", maxHeight: "88vh", border: "1px solid #cbd5e1", borderRadius: 16, padding: 0 }}>
      <header style={{ padding: 20, borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div><h2 id="sca-laposte-title" style={{ margin: 0 }}>Préparer l'export La Poste</h2><p style={{ marginBottom: 0 }}>{selection.length} commande(s) sélectionnée(s). Toute la sélection est conservée.</p></div>
        <button type="button" className="button secondary" disabled={busy} onClick={() => dialog.current?.close()}>Fermer</button>
      </header>
      <div style={{ padding: 20, overflow: "auto", maxHeight: "60vh" }} aria-busy={busy}>
        {busy && <p role="status">Vérification des données enregistrées sur SCA…</p>}
        {message && <p role="status" style={{ padding: 12, background: "#f1f5f9" }}>{message}</p>}
        {result && <>
          <p><strong>{result.count} commande(s) · {result.issues.length} point(s) à corriger</strong></p>
          <p>Les téléphones et codes postaux seront enregistrés en texte dans Excel. Les poids emballés sont ceux du barème du site (2 livres : 1,155 kg ; 4 livres : 2,215 kg).</p>
          {result.mixed && <p>Destinations mixtes : un seul fichier complet, douane ajoutée sur les lignes concernées. La Poste effectuera encore ses contrôles à l'import.</p>}
          {result.issues.length > 0 && <section aria-label="Corrections nécessaires" style={{ background: "#fff1f2", padding: 14, borderRadius: 10 }}>
            <p><strong>Aucun export partiel automatique.</strong> Ouvrez les commandes signalées pour les corriger, puis utilisez « Recontrôler ».</p>
            <ul>{result.issues.map((issue, i) => <li key={i}><a href={`/admin/orders/${encodeURIComponent(issue.reference)}`} target="_blank" rel="noreferrer">{issue.reference}</a> — {issue.name} — <strong>{issue.field}</strong> : {issue.message}</li>)}</ul>
          </section>}
          <div style={{ overflowX: "auto" }}><table className="table" style={{ width: "100%", marginTop: 12 }}>
            <thead><tr>{["Commande / destinataire", "Pays", "Téléphone source → export", "Livres", "Colis kg / cm", "Valeur douane", "Douane"].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{result.preview.map(p => <tr key={p.reference}>
              <td><a href={`/admin/orders/${encodeURIComponent(p.reference)}`} target="_blank" rel="noreferrer">{p.reference}</a><br />{p.name}</td>
              <td>{p.country}</td><td>{p.phoneOriginal}<br /><strong>{p.phone}</strong><br /><small>{p.phoneNote}</small></td>
              <td>{p.quantity}</td><td>{p.weight ?? "?"} kg<br />{p.dimensions} cm</td><td>{p.value} €</td><td>{p.customs === null ? "À vérifier" : p.customs ? "Renseignée" : "Sans douane"}</td>
            </tr>)}</tbody>
          </table></div>
          {alreadyShipped && <label style={{ display: "block", marginTop: 16, padding: 12, background: "#fff7ed" }}><input type="checkbox" checked={acknowledgeShipped} onChange={e => setAcknowledgeShipped(e.target.checked)} /> Certaines commandes sont déjà expédiées/livrées. Je prépare une copie et ne réachèterai pas leurs affranchissements en double.</label>}
        </>}
      </div>
      <footer style={{ display: "flex", justifyContent: "flex-end", gap: 12, padding: 16, borderTop: "1px solid #e2e8f0", flexWrap: "wrap" }}>
        <button type="button" className="button secondary" disabled={busy} onClick={() => void preview(selection)}>Recontrôler</button>
        <button type="button" className="button" disabled={busy || !result || result.issues.length > 0 || (!!alreadyShipped && !acknowledgeShipped)} onClick={() => void download()}>Télécharger l'Excel La Poste ({selection.length})</button>
      </footer>
    </dialog>
  </>;
}
