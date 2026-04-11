
export default function AdminLoginPage() {
  return (
    <main className="page-card">
      <h1>Connexion admin</h1>
      <form action="/api/auth/login" method="post" className="form-grid">
        <label className="full">
          <span>Mot de passe admin</span>
          <input type="password" name="password" required />
        </label>
        <button className="button primary" type="submit">Se connecter</button>
      </form>
    </main>
  );
}
