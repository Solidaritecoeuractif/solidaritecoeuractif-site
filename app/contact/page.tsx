import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contactez Solidarité Cœur Actif pour toute question sur nos actions solidaires, le livre, les commandes ou les demandes d’accompagnement.",
};

export default function Page() {
  const email =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "solidaritecoeuractif@gmail.com";

  return (
    <main className="legal-card">
      <h1>Contact</h1>
      <p>
        Pour toute demande d’information concernant l’association, les actions de
        solidarité, les collectes, les soutiens ou les participations aux frais de
        livraison, vous pouvez nous contacter aux coordonnées suivantes :
      </p>
      <p>{email}</p>
      <p>0033 7 45 22 41 24</p>
    </main>
  );
}