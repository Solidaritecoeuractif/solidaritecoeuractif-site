import Link from "next/link";

export function Footer() {
  const email =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
    "solidaritecoeuractif@gmail.com";

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <h3>Solidarité Cœur Actif</h3>
          <p>
            Association à but non lucratif engagée auprès des personnes en
            situation de précarité et de vulnérabilité.
          </p>
        </div>

        <div>
          <h4>Informations</h4>
          <ul>
            <li>
              <Link href="/mentions-legales">Mentions légales</Link>
            </li>
            <li>
              <Link href="/politique-confidentialite">
                Politique de confidentialité
              </Link>
            </li>
            <li>
              <Link href="/conditions">Conditions d’utilisation</Link>
            </li>
            <li>
              <Link href="/contact">Contact</Link>
            </li>
          </ul>
        </div>

        <div>
          <h4>Contact</h4>
          <p>{email}</p>
          <p>
            Actions solidaires, collectes, soutiens associatifs et
            participations aux frais de livraison.
          </p>
        </div>
      </div>
    </footer>
  );
}