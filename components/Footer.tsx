
import Link from "next/link";

export function Footer() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "contact@example.com";

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <h3>Solidarité Cœur Actif</h3>
          <p>Plateforme premium pour commandes, soutien, dons et collectes.</p>
        </div>
        <div>
          <h4>Informations</h4>
          <ul>
            <li><Link href="/mentions-legales">Mentions légales</Link></li>
            <li><Link href="/politique-confidentialite">Politique de confidentialité</Link></li>
            <li><Link href="/conditions">Conditions</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4>Support</h4>
          <p>{email}</p>
          <p>Paiement sécurisé via Stripe Checkout.</p>
        </div>
      </div>
    </footer>
  );
}
