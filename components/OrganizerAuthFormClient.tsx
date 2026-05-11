"use client";

import { useState } from "react";
import Link from "next/link";

type Mode = "signup" | "login";

export default function OrganizerAuthFormClient({ mode }: { mode: Mode }) {
  const isSignup = mode === "signup";

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        isSignup ? "/api/organisateur/inscription" : "/api/organisateur/connexion",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName,
            email,
            password,
            passwordConfirmation,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          typeof data?.error === "string"
            ? data.error
            : "Impossible de valider cette demande."
        );
        return;
      }

      window.location.href = data.redirectTo || "/organisateur/billetteries";
    } catch {
      setMessage("Erreur pendant la validation du formulaire.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      style={{
        border: "1px solid #dbe3ee",
        borderRadius: "20px",
        padding: "22px",
        background: "#ffffff",
        boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)",
        display: "grid",
        gap: "14px",
        maxWidth: "520px",
        width: "100%",
      }}
    >
      <div>
        <p
          style={{
            margin: "0 0 8px",
            color: "#64748b",
            fontWeight: 800,
            fontSize: "14px",
          }}
        >
          Espace organisateur
        </p>

        <h1 style={{ margin: 0 }}>
          {isSignup ? "Créer un compte organisateur" : "Connexion organisateur"}
        </h1>

        <p style={{ color: "#64748b", lineHeight: 1.6, marginBottom: 0 }}>
          {isSignup
            ? "Crée ton accès pour gérer tes billetteries, suivre les inscriptions et préparer tes événements."
            : "Connecte-toi pour retrouver tes billetteries et gérer tes inscriptions."}
        </p>
      </div>

      {isSignup ? (
        <label style={{ display: "grid", gap: "6px" }}>
          <span style={{ fontWeight: 800 }}>Nom organisateur / structure</span>
          <input
            className="input"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Ex. Association, paroisse, équipe..."
            required
          />
        </label>
      ) : null}

      <label style={{ display: "grid", gap: "6px" }}>
        <span style={{ fontWeight: 800 }}>Email</span>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="email@exemple.com"
          required
        />
      </label>

      <label style={{ display: "grid", gap: "6px" }}>
        <span style={{ fontWeight: 800 }}>Mot de passe</span>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Minimum 8 caractères"
          required
        />
      </label>

      {isSignup ? (
        <label style={{ display: "grid", gap: "6px" }}>
          <span style={{ fontWeight: 800 }}>Confirmer le mot de passe</span>
          <input
            className="input"
            type="password"
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            placeholder="Répéter le mot de passe"
            required
          />
        </label>
      ) : null}

      {message ? (
        <div
          style={{
            border: "1px solid #fecaca",
            borderRadius: "14px",
            padding: "12px",
            background: "#fef2f2",
            color: "#991b1b",
            fontWeight: 800,
          }}
        >
          {message}
        </div>
      ) : null}

      <button type="submit" className="button" disabled={loading}>
        {loading
          ? "Validation..."
          : isSignup
            ? "Créer mon compte organisateur"
            : "Me connecter"}
      </button>

      <div style={{ color: "#64748b", lineHeight: 1.6 }}>
        {isSignup ? (
          <>
            Déjà un compte ?{" "}
            <Link href="/organisateur/connexion" style={{ fontWeight: 800 }}>
              Se connecter
            </Link>
          </>
        ) : (
          <>
            Pas encore de compte ?{" "}
            <Link href="/organisateur/inscription" style={{ fontWeight: 800 }}>
              Créer un compte organisateur
            </Link>
          </>
        )}
      </div>
    </form>
  );
}