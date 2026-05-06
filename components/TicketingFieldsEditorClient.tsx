"use client";

import { useState } from "react";
import type {
  TicketingCustomField,
  TicketingCustomFieldTarget,
  TicketingCustomFieldType,
  TicketingEvent,
} from "@/lib/ticketing/types";

type DraftField = {
  id: string;
  label: string;
  fieldKey: string;
  type: TicketingCustomFieldType;
  target: TicketingCustomFieldTarget;
  isRequired: boolean;
  isActive: boolean;
  options: string;
  position: string;
  createdAt?: string;
};

function slugifyFieldKey(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function fieldTypeLabel(type: TicketingCustomFieldType) {
  if (type === "short_text") return "Texte court";
  if (type === "long_text") return "Texte long";
  if (type === "email") return "Email";
  if (type === "phone") return "Téléphone";
  if (type === "number") return "Nombre";
  if (type === "date") return "Date";
  if (type === "select") return "Liste de choix";
  if (type === "checkbox") return "Case à cocher";
  return "Texte court";
}

function targetLabel(target: TicketingCustomFieldTarget) {
  if (target === "payer") return "Payeur";
  return "Participant";
}

function toDraftField(field: TicketingCustomField): DraftField {
  return {
    id: field.id,
    label: field.label,
    fieldKey: field.fieldKey,
    type: field.type,
    target: field.target,
    isRequired: field.isRequired,
    isActive: field.isActive,
    options: (field.options || []).join(", "),
    position: String(field.position ?? 0),
    createdAt: field.createdAt,
  };
}

function newDraftField(position: number): DraftField {
  return {
    id: crypto.randomUUID(),
    label: "",
    fieldKey: "",
    type: "short_text",
    target: "participant",
    isRequired: false,
    isActive: true,
    options: "",
    position: String(position),
    createdAt: new Date().toISOString(),
  };
}

export default function TicketingFieldsEditorClient({
  event,
  fields,
}: {
  event: TicketingEvent;
  fields: TicketingCustomField[];
}) {
  const [draftFields, setDraftFields] = useState<DraftField[]>(
    fields.length > 0
      ? fields.map(toDraftField)
      : []
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function addField() {
    setDraftFields((current) => [...current, newDraftField(current.length)]);
    setMessage("");
  }

  function updateField(id: string, patch: Partial<DraftField>) {
    setDraftFields((current) =>
      current.map((field) => {
        if (field.id !== id) return field;

        const next = { ...field, ...patch };

        if (
          Object.prototype.hasOwnProperty.call(patch, "label") &&
          !field.fieldKey.trim()
        ) {
          next.fieldKey = slugifyFieldKey(String(patch.label || ""));
        }

        return next;
      })
    );

    setMessage("");
  }

  function duplicateField(id: string) {
    const source = draftFields.find((field) => field.id === id);

    if (!source) return;

    setDraftFields((current) => [
      ...current,
      {
        ...source,
        id: crypto.randomUUID(),
        label: `${source.label || "Champ"} copie`,
        fieldKey: `${source.fieldKey || "champ"}_copie_${crypto.randomUUID()
          .slice(0, 4)
          .toLowerCase()}`,
        position: String(current.length),
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function removeField(id: string) {
    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer cette information complémentaire ?"
    );

    if (!confirmed) return;

    setDraftFields((current) => current.filter((field) => field.id !== id));
  }

  async function saveFields() {
    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/ticketing/events/${event.id}/fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: draftFields.map((field, index) => ({
            ...field,
            label: field.label.trim() || "Champ sans nom",
            fieldKey:
              field.fieldKey.trim() ||
              slugifyFieldKey(field.label) ||
              `champ_${crypto.randomUUID().slice(0, 8)}`,
            position: Number.isFinite(Number(field.position))
              ? Number(field.position)
              : index,
            options: field.options,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          typeof data?.error === "string"
            ? data.error
            : "Impossible d’enregistrer les informations complémentaires."
        );
        return;
      }

      setDraftFields(data.fields.map(toDraftField));
      setMessage("Informations complémentaires enregistrées.");
    } catch {
      setMessage("Erreur pendant l’enregistrement des champs complémentaires.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      style={{
        border: "1px solid #dbe3ee",
        borderRadius: "16px",
        padding: "18px",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "14px",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Informations complémentaires</h2>
          <p style={{ margin: "6px 0 0", color: "#64748b" }}>
            Ajoute des champs demandés au payeur ou à chaque participant, avec
            le choix obligatoire ou facultatif.
          </p>
        </div>

        <button type="button" className="button" onClick={addField}>
          Ajouter une information
        </button>
      </div>

      {message ? (
        <div
          style={{
            border: "1px solid #dbe3ee",
            borderRadius: "14px",
            padding: "12px",
            background: "#f8fafc",
            color:
              message.includes("Impossible") || message.includes("Erreur")
                ? "#991b1b"
                : "#166534",
            fontWeight: 700,
            marginBottom: "14px",
          }}
        >
          {message}
        </div>
      ) : null}

      {draftFields.length === 0 ? (
        <p style={{ color: "#64748b", marginBottom: 0 }}>
          Aucun champ complémentaire pour le moment.
        </p>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {draftFields.map((field, index) => (
            <div
              key={field.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "14px",
                background: "#f8fafc",
                display: "grid",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <strong>Information {index + 1}</strong>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      updateField(field.id, { isRequired: !field.isRequired })
                    }
                  >
                    {field.isRequired ? "Obligatoire" : "Facultatif"}
                  </button>

                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      updateField(field.id, { isActive: !field.isActive })
                    }
                  >
                    {field.isActive ? "Actif" : "Inactif"}
                  </button>

                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => duplicateField(field.id)}
                  >
                    Dupliquer
                  </button>

                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => removeField(field.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                  gap: "12px",
                }}
              >
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontWeight: 700 }}>Nom du champ</span>
                  <input
                    className="input"
                    value={field.label}
                    onChange={(event) =>
                      updateField(field.id, { label: event.target.value })
                    }
                    placeholder="Ex. Âge, Régime alimentaire, Atelier..."
                  />
                </label>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontWeight: 700 }}>Clé technique</span>
                  <input
                    className="input"
                    value={field.fieldKey}
                    onChange={(event) =>
                      updateField(field.id, {
                        fieldKey: slugifyFieldKey(event.target.value),
                      })
                    }
                    placeholder="age, regime_alimentaire..."
                  />
                </label>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontWeight: 700 }}>Demandé à</span>
                  <select
                    className="input"
                    value={field.target}
                    onChange={(event) =>
                      updateField(field.id, {
                        target: event.target.value as TicketingCustomFieldTarget,
                      })
                    }
                  >
                    <option value="participant">Participant</option>
                    <option value="payer">Payeur</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontWeight: 700 }}>Type</span>
                  <select
                    className="input"
                    value={field.type}
                    onChange={(event) =>
                      updateField(field.id, {
                        type: event.target.value as TicketingCustomFieldType,
                      })
                    }
                  >
                    <option value="short_text">Texte court</option>
                    <option value="long_text">Texte long</option>
                    <option value="email">Email</option>
                    <option value="phone">Téléphone</option>
                    <option value="number">Nombre</option>
                    <option value="date">Date</option>
                    <option value="select">Liste de choix</option>
                    <option value="checkbox">Case à cocher</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontWeight: 700 }}>Ordre</span>
                  <input
                    className="input"
                    value={field.position}
                    onChange={(event) =>
                      updateField(field.id, { position: event.target.value })
                    }
                    placeholder="0"
                  />
                </label>
              </div>

              {field.type === "select" ? (
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontWeight: 700 }}>
                    Options de la liste, séparées par des virgules
                  </span>
                  <input
                    className="input"
                    value={field.options}
                    onChange={(event) =>
                      updateField(field.id, { options: event.target.value })
                    }
                    placeholder="Option 1, Option 2, Option 3"
                  />
                </label>
              ) : null}

              <div style={{ color: "#64748b", fontSize: "13px" }}>
                Aperçu : {field.label || "Champ sans nom"} —{" "}
                {targetLabel(field.target)} — {fieldTypeLabel(field.type)} —{" "}
                {field.isRequired ? "obligatoire" : "facultatif"} —{" "}
                {field.isActive ? "actif" : "inactif"}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "16px" }}>
        <button
          type="button"
          className="button"
          onClick={saveFields}
          disabled={saving}
        >
          {saving
            ? "Enregistrement..."
            : "Enregistrer les informations complémentaires"}
        </button>
      </div>
    </section>
  );
}