"use client";

import { useState, type ReactNode } from "react";
import type { TicketingEvent, TicketingRate } from "@/lib/ticketing/types";

type DraftRateType = "fixed" | "free_amount" | "free";

type DraftRate = {
  id: string;
  name: string;
  description: string;
  type: DraftRateType;
  amount: string;
  minimumAmount: string;
  totalLimit: string;
  perOrderLimit: string;
  isActive: boolean;
  promoCodeEnabled: boolean;
  promoCodePublic: boolean;
  promoCode: string;
  promoDiscountPercent: string;
  createdAt?: string;
};

function toDateTimeLocalValue(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);

  return local.toISOString().slice(0, 16);
}

function dateTimeLocalToIso(value: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString();
}

function centsToEuros(value?: number) {
  if (typeof value !== "number") return "";
  return String(value / 100);
}

function optionalNumberToString(value?: number) {
  if (typeof value !== "number") return "";
  return String(value);
}

function normalizePercent(value?: number) {
  if (typeof value !== "number") return "0";
  return String(Math.max(0, Math.min(100, Math.round(value))));
}

function cleanPercent(value: string) {
  const number = Number(String(value || "").trim());

  if (!Number.isFinite(number)) return "0";

  return String(Math.max(0, Math.min(100, Math.round(number))));
}

function toDraftRate(rate: TicketingRate): DraftRate {
  return {
    id: rate.id,
    name: rate.name,
    description: rate.description || "",
    type: rate.type,
    amount: centsToEuros(rate.amount),
    minimumAmount: centsToEuros(rate.minimumAmount),
    totalLimit: optionalNumberToString(rate.totalQuantityLimit),
    perOrderLimit: optionalNumberToString(rate.quantityPerOrderLimit),
    isActive: rate.isActive,
    promoCodeEnabled: Boolean(rate.promoCodeEnabled),
    promoCodePublic: Boolean(rate.promoCodePublic),
    promoCode: rate.promoCode || "",
    promoDiscountPercent: normalizePercent(rate.promoDiscountPercent),
    createdAt: rate.createdAt,
  };
}

function newDraftRate(): DraftRate {
  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
    type: "fixed",
    amount: "",
    minimumAmount: "",
    totalLimit: "",
    perOrderLimit: "",
    isActive: true,
    promoCodeEnabled: false,
    promoCodePublic: false,
    promoCode: "",
    promoDiscountPercent: "0",
    createdAt: new Date().toISOString(),
  };
}

function sectionStyle(accent: string, background: string) {
  return {
    border: `1px solid ${accent}`,
    borderRadius: "18px",
    padding: "18px",
    background,
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.045)",
  } as const;
}

function gridStyle(minWidth = 240) {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
    gap: "14px",
  } as const;
}

function labelStyle() {
  return {
    display: "grid",
    gap: "6px",
  } as const;
}

function labelTitleStyle() {
  return {
    fontWeight: 800,
    color: "#1e293b",
  } as const;
}

async function compressImageFile(file: File) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Merci de choisir une image JPG, PNG ou WebP.");
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error(
      "Cette image est trop lourde. Merci de choisir une image de moins de 8 Mo."
    );
  }

  const originalDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";

      if (!result.startsWith("data:image/")) {
        reject(new Error("Impossible de lire cette image."));
        return;
      }

      resolve(result);
    };

    reader.onerror = () => reject(new Error("Impossible de lire cette image."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de préparer cette image."));
    img.src = originalDataUrl;
  });

  const maxWidth = 1400;
  const maxHeight = 900;

  let width = image.width;
  let height = image.height;

  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);

  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Impossible de compresser cette image.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const qualities = [0.86, 0.78, 0.7, 0.62, 0.54];

  for (const quality of qualities) {
    const compressed = canvas.toDataURL("image/jpeg", quality);

    if (compressed.length <= 1_000_000) {
      return {
        dataUrl: compressed,
        originalSize: file.size,
        finalSizeEstimate: Math.round((compressed.length * 3) / 4),
      };
    }
  }

  const compressed = canvas.toDataURL("image/jpeg", 0.5);

  return {
    dataUrl: compressed,
    originalSize: file.size,
    finalSizeEstimate: Math.round((compressed.length * 3) / 4),
  };
}

export default function OrganizerEditTicketingClient({
  event,
  rates,
  extraSection,
}: {
  event: TicketingEvent;
  rates: TicketingRate[];
  extraSection?: ReactNode;
}) {
  const [title, setTitle] = useState(event.title);
  const [formTypeLabel, setFormTypeLabel] = useState(event.formTypeLabel || "");
  const [locationName, setLocationName] = useState(event.locationName || "");
  const [addressLine, setAddressLine] = useState(event.addressLine || "");
  const [postalCode, setPostalCode] = useState(event.postalCode || "");
  const [city, setCity] = useState(event.city || "");
  const [country, setCountry] = useState(event.country || "");
  const [durationType, setDurationType] = useState(event.durationType);
  const [startsAt, setStartsAt] = useState(toDateTimeLocalValue(event.startsAt));
  const [endsAt, setEndsAt] = useState(toDateTimeLocalValue(event.endsAt));
  const [organizerEmail, setOrganizerEmail] = useState(
    event.organizerEmail || ""
  );
  const [organizerPhone, setOrganizerPhone] = useState(
    event.organizerPhone || ""
  );
  const [shortDescription, setShortDescription] = useState(
    event.shortDescription || ""
  );

  const [bannerImageUrl, setBannerImageUrl] = useState(
    event.bannerImageUrl || event.thumbnailImageUrl || ""
  );
  const [imageMessage, setImageMessage] = useState("");

  const [confirmationEmailEnabled, setConfirmationEmailEnabled] = useState(
    event.confirmationEmailEnabled !== false
  );
  const [confirmationEmailSubject, setConfirmationEmailSubject] = useState(
    event.confirmationEmailSubject || ""
  );
  const [confirmationEmailMessage, setConfirmationEmailMessage] = useState(
    event.confirmationEmailMessage || ""
  );

  const [draftRates, setDraftRates] = useState<DraftRate[]>(
    rates.length > 0 ? rates.map(toDraftRate) : [newDraftRate()]
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function addRate() {
    setDraftRates((current) => [...current, newDraftRate()]);
  }

  function updateRate(id: string, patch: Partial<DraftRate>) {
    setDraftRates((current) =>
      current.map((rate) => {
        if (rate.id !== id) return rate;

        const next = { ...rate, ...patch };

        if (patch.promoCodeEnabled === false) {
          next.promoCodePublic = false;
          next.promoCode = "";
          next.promoDiscountPercent = "0";
        }

        if (Object.prototype.hasOwnProperty.call(patch, "promoDiscountPercent")) {
          next.promoDiscountPercent = cleanPercent(
            String(patch.promoDiscountPercent || "0")
          );
        }

        return next;
      })
    );
  }

  function duplicateRate(id: string) {
    const rate = draftRates.find((entry) => entry.id === id);

    if (!rate) return;

    setDraftRates((current) => [
      ...current,
      {
        ...rate,
        id: crypto.randomUUID(),
        name: `${rate.name || "Tarif"} copie`,
        promoCodeEnabled: false,
        promoCodePublic: false,
        promoCode: "",
        promoDiscountPercent: "0",
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function removeRate(id: string) {
    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer ce tarif ?"
    );

    if (!confirmed) return;

    setDraftRates((current) => current.filter((rate) => rate.id !== id));
  }

  async function handleImageSelection(file?: File) {
    setImageMessage("");

    if (!file) return;

    try {
      setImageMessage("Préparation de l’image en cours...");

      const compressed = await compressImageFile(file);

      if (compressed.dataUrl.length > 1_200_000) {
        setImageMessage(
          "Même après compression, cette image reste trop lourde. Merci d’utiliser une image plus simple ou moins grande."
        );
        return;
      }

      setBannerImageUrl(compressed.dataUrl);

      const originalKo = Math.round(compressed.originalSize / 1024);
      const finalKo = Math.round(compressed.finalSizeEstimate / 1024);

      setImageMessage(
        `Image ajoutée et optimisée automatiquement (${originalKo} Ko → environ ${finalKo} Ko). Pense à enregistrer les modifications.`
      );
    } catch (error) {
      setImageMessage(
        error instanceof Error
          ? error.message
          : "Impossible de préparer cette image."
      );
    }
  }

  function removeImage() {
    const confirmed = window.confirm("Voulez-vous retirer cette image ?");
    if (!confirmed) return;

    setBannerImageUrl("");
    setImageMessage("Image retirée. Pense à enregistrer les modifications.");
  }

  async function saveChanges() {
    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/organisateur/billetteries/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          formTypeLabel,
          locationName,
          addressLine,
          postalCode,
          city,
          country,
          durationType,
          startsAt: dateTimeLocalToIso(startsAt),
          endsAt: dateTimeLocalToIso(endsAt),
          organizerEmail,
          organizerPhone,
          shortDescription,
          bannerImageUrl,
          confirmationEmailEnabled,
          confirmationEmailSubject,
          confirmationEmailMessage,
          rates: draftRates.map((rate) => ({
            ...rate,
            promoCode: rate.promoCode.trim().toUpperCase(),
            promoDiscountPercent: cleanPercent(rate.promoDiscountPercent),
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          typeof data?.error === "string"
            ? data.error
            : "Impossible d’enregistrer cette billetterie."
        );
        return;
      }

      setMessage("Billetterie enregistrée.");

      setTimeout(() => {
        window.location.href = `/organisateur/billetteries/${event.slug}`;
      }, 700);
    } catch {
      setMessage("Erreur pendant l’enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "18px" }}>
      {message ? (
        <div
          style={{
            border: "1px solid #dbe3ee",
            borderRadius: "14px",
            padding: "12px",
            background: "#ffffff",
            color:
              message.includes("Impossible") || message.includes("Erreur")
                ? "#991b1b"
                : "#166534",
            fontWeight: 800,
          }}
        >
          {message}
        </div>
      ) : null}

      <section style={sectionStyle("#bfdbfe", "#f8fbff")}>
        <h2 style={{ marginTop: 0, color: "#1d4ed8" }}>
          Informations générales
        </h2>

        <div style={gridStyle()}>
          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Nom de la billetterie</span>
            <input
              className="input"
              value={title}
              onChange={(inputEvent) => setTitle(inputEvent.target.value)}
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Type de formulaire</span>
            <input
              className="input"
              value={formTypeLabel}
              onChange={(inputEvent) =>
                setFormTypeLabel(inputEvent.target.value)
              }
            />
          </label>
        </div>

        <label style={{ ...labelStyle(), marginTop: "14px" }}>
          <span style={labelTitleStyle()}>Description courte</span>
          <textarea
            className="input"
            value={shortDescription}
            onChange={(inputEvent) =>
              setShortDescription(inputEvent.target.value)
            }
            rows={5}
          />
        </label>
      </section>

      <section style={sectionStyle("#bae6fd", "#f8fcff")}>
        <h2 style={{ marginTop: 0, color: "#0369a1" }}>
          Image ou logo de la billetterie
        </h2>

        <p style={{ marginTop: 0, color: "#64748b", lineHeight: 1.6 }}>
          Ajoute le logo de l’organisation ou une image représentative. Elle
          apparaîtra sur la page publique de la billetterie.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "14px",
            alignItems: "start",
          }}
        >
          <div
            style={{
              border: "1px dashed #93c5fd",
              borderRadius: "18px",
              padding: "16px",
              background: "#ffffff",
              display: "grid",
              gap: "12px",
            }}
          >
            <label style={{ display: "grid", gap: "8px" }}>
              <span style={labelTitleStyle()}>Choisir une image</span>
              <input
                className="input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(inputEvent) =>
                  handleImageSelection(inputEvent.target.files?.[0])
                }
              />
            </label>

            <small style={{ color: "#64748b", lineHeight: 1.5 }}>
              Formats acceptés : JPG, PNG, WebP. Les images sont réduites
              automatiquement avant enregistrement.
            </small>

            {bannerImageUrl ? (
              <button
                type="button"
                className="button secondary"
                onClick={removeImage}
              >
                Retirer l’image
              </button>
            ) : null}

            {imageMessage ? (
              <div
                style={{
                  border:
                    imageMessage.includes("trop") ||
                    imageMessage.includes("Impossible") ||
                    imageMessage.includes("Merci")
                      ? "1px solid #fecaca"
                      : "1px solid #bbf7d0",
                  borderRadius: "14px",
                  padding: "10px 12px",
                  background:
                    imageMessage.includes("trop") ||
                    imageMessage.includes("Impossible") ||
                    imageMessage.includes("Merci")
                      ? "#fef2f2"
                      : "#f0fdf4",
                  color:
                    imageMessage.includes("trop") ||
                    imageMessage.includes("Impossible") ||
                    imageMessage.includes("Merci")
                      ? "#991b1b"
                      : "#166534",
                  fontWeight: 800,
                }}
              >
                {imageMessage}
              </div>
            ) : null}
          </div>

          <div
            style={{
              border: "1px solid #dbe3ee",
              borderRadius: "18px",
              padding: "14px",
              background: "#ffffff",
              minHeight: "180px",
              display: "grid",
              placeItems: "center",
              overflow: "hidden",
            }}
          >
            {bannerImageUrl ? (
              <img
                src={bannerImageUrl}
                alt="Aperçu de l’image de la billetterie"
                style={{
                  maxWidth: "100%",
                  maxHeight: "260px",
                  objectFit: "contain",
                  borderRadius: "14px",
                }}
              />
            ) : (
              <p
                style={{
                  color: "#64748b",
                  textAlign: "center",
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                Aucune image ajoutée pour le moment.
              </p>
            )}
          </div>
        </div>
      </section>

      <section style={sectionStyle("#c4b5fd", "#fbfaff")}>
        <h2 style={{ marginTop: 0, color: "#6d28d9" }}>Lieu et durée</h2>

        <div style={gridStyle(220)}>
          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Lieu</span>
            <input
              className="input"
              value={locationName}
              onChange={(inputEvent) => setLocationName(inputEvent.target.value)}
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Adresse</span>
            <input
              className="input"
              value={addressLine}
              onChange={(inputEvent) => setAddressLine(inputEvent.target.value)}
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Code postal</span>
            <input
              className="input"
              value={postalCode}
              onChange={(inputEvent) => setPostalCode(inputEvent.target.value)}
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Ville</span>
            <input
              className="input"
              value={city}
              onChange={(inputEvent) => setCity(inputEvent.target.value)}
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Pays</span>
            <input
              className="input"
              value={country}
              onChange={(inputEvent) => setCountry(inputEvent.target.value)}
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Durée</span>
            <select
              className="input"
              value={durationType}
              onChange={(inputEvent) =>
                setDurationType(
                  inputEvent.target.value as "none" | "one_day" | "several_days"
                )
              }
            >
              <option value="none">Sans durée définie</option>
              <option value="one_day">Sur une journée</option>
              <option value="several_days">Sur plusieurs jours</option>
            </select>
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Début</span>
            <input
              className="input"
              type="datetime-local"
              value={startsAt}
              onChange={(inputEvent) => setStartsAt(inputEvent.target.value)}
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Fin</span>
            <input
              className="input"
              type="datetime-local"
              value={endsAt}
              onChange={(inputEvent) => setEndsAt(inputEvent.target.value)}
            />
          </label>
        </div>
      </section>

      <section style={sectionStyle("#fed7aa", "#fffaf5")}>
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
            <h2 style={{ margin: 0, color: "#c2410c" }}>Tarifs</h2>
            <p style={{ margin: "6px 0 0", color: "#64748b" }}>
              {draftRates.filter((rate) => rate.isActive).length} tarif(s)
              actif(s)
            </p>
          </div>

          <button type="button" className="button" onClick={addRate}>
            Ajouter un tarif
          </button>
        </div>

        <div style={{ display: "grid", gap: "12px" }}>
          {draftRates.map((rate, index) => (
            <div
              key={rate.id}
              style={{
                border: "1px solid #fed7aa",
                borderRadius: "14px",
                padding: "14px",
                background: "#ffffff",
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
                <strong style={{ color: "#9a3412" }}>Tarif {index + 1}</strong>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      updateRate(rate.id, { isActive: !rate.isActive })
                    }
                  >
                    {rate.isActive ? "Désactiver" : "Activer"}
                  </button>

                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => duplicateRate(rate.id)}
                  >
                    Dupliquer
                  </button>

                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => removeRate(rate.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              <div style={gridStyle(180)}>
                <label style={labelStyle()}>
                  <span style={labelTitleStyle()}>Nom du tarif</span>
                  <input
                    className="input"
                    value={rate.name}
                    onChange={(inputEvent) =>
                      updateRate(rate.id, { name: inputEvent.target.value })
                    }
                  />
                </label>

                <label style={labelStyle()}>
                  <span style={labelTitleStyle()}>Type</span>
                  <select
                    className="input"
                    value={rate.type}
                    onChange={(inputEvent) =>
                      updateRate(rate.id, {
                        type: inputEvent.target.value as DraftRateType,
                      })
                    }
                  >
                    <option value="fixed">Prix fixe</option>
                    <option value="free_amount">Prix libre</option>
                    <option value="free">Gratuit</option>
                  </select>
                </label>

                {rate.type === "fixed" ? (
                  <label style={labelStyle()}>
                    <span style={labelTitleStyle()}>Montant (€)</span>
                    <input
                      className="input"
                      value={rate.amount}
                      onChange={(inputEvent) =>
                        updateRate(rate.id, { amount: inputEvent.target.value })
                      }
                    />
                  </label>
                ) : null}

                {rate.type === "free_amount" ? (
                  <label style={labelStyle()}>
                    <span style={labelTitleStyle()}>Minimum (€)</span>
                    <input
                      className="input"
                      value={rate.minimumAmount}
                      onChange={(inputEvent) =>
                        updateRate(rate.id, {
                          minimumAmount: inputEvent.target.value,
                        })
                      }
                    />
                  </label>
                ) : null}

                <label style={labelStyle()}>
                  <span style={labelTitleStyle()}>Limite totale</span>
                  <input
                    className="input"
                    value={rate.totalLimit}
                    onChange={(inputEvent) =>
                      updateRate(rate.id, { totalLimit: inputEvent.target.value })
                    }
                  />
                </label>

                <label style={labelStyle()}>
                  <span style={labelTitleStyle()}>Limite par commande</span>
                  <input
                    className="input"
                    value={rate.perOrderLimit}
                    onChange={(inputEvent) =>
                      updateRate(rate.id, {
                        perOrderLimit: inputEvent.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <label style={labelStyle()}>
                <span style={labelTitleStyle()}>Description du tarif</span>
                <textarea
                  className="input"
                  value={rate.description}
                  onChange={(inputEvent) =>
                    updateRate(rate.id, { description: inputEvent.target.value })
                  }
                  rows={3}
                />
              </label>

              <section
                style={{
                  border: "1px solid #dbe3ee",
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
                  <div>
                    <strong>Code promo</strong>
                    <p style={{ margin: "4px 0 0", color: "#64748b" }}>
                      Réduction appliquée uniquement à ce tarif.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      updateRate(rate.id, {
                        promoCodeEnabled: !rate.promoCodeEnabled,
                      })
                    }
                  >
                    {rate.promoCodeEnabled
                      ? "Code promo activé"
                      : "Code promo désactivé"}
                  </button>
                </div>

                {rate.promoCodeEnabled ? (
                  <div style={{ display: "grid", gap: "12px" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                        flexWrap: "wrap",
                        border: rate.promoCodePublic
                          ? "1px solid #bbf7d0"
                          : "1px solid #e5e7eb",
                        background: rate.promoCodePublic ? "#f0fdf4" : "#ffffff",
                        borderRadius: "14px",
                        padding: "12px",
                      }}
                    >
                      <strong>
                        Affichage public : {rate.promoCodePublic ? "OUI" : "NON"}
                      </strong>

                      <button
                        type="button"
                        className="button secondary"
                        onClick={() =>
                          updateRate(rate.id, {
                            promoCodePublic: !rate.promoCodePublic,
                          })
                        }
                      >
                        {rate.promoCodePublic
                          ? "Ne pas afficher publiquement"
                          : "Afficher publiquement"}
                      </button>

                      <span style={{ color: "#64748b", fontSize: "13px" }}>
                        Si OUI, le bouton “J’ai un code promo” apparaîtra sur la
                        page publique.
                      </span>
                    </div>

                    <div style={gridStyle(220)}>
                      <label style={labelStyle()}>
                        <span style={labelTitleStyle()}>Code</span>
                        <input
                          className="input"
                          value={rate.promoCode}
                          onChange={(inputEvent) =>
                            updateRate(rate.id, {
                              promoCode: inputEvent.target.value
                                .trim()
                                .toUpperCase(),
                            })
                          }
                        />
                      </label>

                      <label style={labelStyle()}>
                        <span style={labelTitleStyle()}>
                          Réduction : {rate.promoDiscountPercent || "0"} %
                        </span>

                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={rate.promoDiscountPercent || "0"}
                          onChange={(inputEvent) =>
                            updateRate(rate.id, {
                              promoDiscountPercent: inputEvent.target.value,
                            })
                          }
                        />

                        <input
                          className="input"
                          value={rate.promoDiscountPercent}
                          onChange={(inputEvent) =>
                            updateRate(rate.id, {
                              promoDiscountPercent: inputEvent.target.value,
                            })
                          }
                        />
                      </label>
                    </div>

                    <div style={{ color: "#64748b", fontSize: "13px" }}>
                      Aperçu code promo :{" "}
                      {rate.promoCode ? (
                        <>
                          <strong>{rate.promoCode}</strong> —{" "}
                          {rate.promoDiscountPercent || "0"} % de réduction —{" "}
                          {rate.promoCodePublic
                            ? "affiché publiquement"
                            : "non affiché publiquement"}
                        </>
                      ) : (
                        "aucun code défini"
                      )}
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          ))}
        </div>
      </section>

      <section style={sectionStyle("#fecaca", "#fffafa")}>
        <h2 style={{ marginTop: 0, color: "#b91c1c" }}>
          Email de confirmation
        </h2>

        <div style={gridStyle()}>
          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Envoi automatique</span>
            <select
              className="input"
              value={confirmationEmailEnabled ? "yes" : "no"}
              onChange={(inputEvent) =>
                setConfirmationEmailEnabled(inputEvent.target.value === "yes")
              }
            >
              <option value="yes">Activé après paiement</option>
              <option value="no">Désactivé pour cette billetterie</option>
            </select>
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Objet de l’email</span>
            <input
              className="input"
              value={confirmationEmailSubject}
              onChange={(inputEvent) =>
                setConfirmationEmailSubject(inputEvent.target.value)
              }
            />
          </label>
        </div>

        <label style={{ ...labelStyle(), marginTop: "14px" }}>
          <span style={labelTitleStyle()}>Message personnalisé</span>
          <textarea
            className="input"
            value={confirmationEmailMessage}
            onChange={(inputEvent) =>
              setConfirmationEmailMessage(inputEvent.target.value)
            }
            rows={7}
          />
        </label>
      </section>

      <section style={sectionStyle("#99f6e4", "#f5fffd")}>
        <h2 style={{ marginTop: 0, color: "#0f766e" }}>Contact organisateur</h2>

        <div style={gridStyle()}>
          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Email organisateur</span>
            <input
              className="input"
              value={organizerEmail}
              onChange={(inputEvent) =>
                setOrganizerEmail(inputEvent.target.value)
              }
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Téléphone organisateur</span>
            <input
              className="input"
              value={organizerPhone}
              onChange={(inputEvent) =>
                setOrganizerPhone(inputEvent.target.value)
              }
            />
          </label>
        </div>
      </section>

      {extraSection ? <div>{extraSection}</div> : null}

      <section
        style={{
          border: "1px solid #dbe3ee",
          borderRadius: "18px",
          padding: "16px",
          background: "#ffffff",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          className="button"
          onClick={saveChanges}
          disabled={saving}
        >
          {saving ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>

        <a
          href={`/organisateur/billetteries/${event.slug}`}
          className="button secondary"
          style={{ textDecoration: "none" }}
        >
          Annuler
        </a>
      </section>
    </div>
  );
}