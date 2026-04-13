import { storage } from "@/lib/storage";

export default async function ProductsAdminPage() {
  const products = await storage().getProducts();

  return (
    <div className="admin-grid">
      <section className="panel">
        <h1>Créer une offre</h1>
        <form
          action="/api/products"
          method="post"
          encType="multipart/form-data"
          className="form-grid"
        >
          <label><span>Titre</span><input name="title" required /></label>
          <label><span>Sous-titre</span><input name="subtitle" /></label>
          <label className="full"><span>Description courte</span><textarea name="shortDescription" required /></label>
          <label className="full"><span>Description longue</span><textarea name="longDescription" required /></label>

          <label>
            <span>Image (fichier)</span>
            <input name="imageFile" type="file" accept="image/*" />
          </label>

          <label><span>Type d’offre</span><select name="offerType"><option value="product">Produit</option><option value="donation">Don</option><option value="campaign">Collecte</option><option value="participation">Participation</option></select></label>
          <label><span>Mode de prix</span><select name="pricingMode"><option value="fixed">Prix fixe</option><option value="flexible">Montant libre</option></select></label>
          <label><span>Prix fixe (centimes)</span><input name="fixedPrice" type="number" /></label>
          <label><span>Minimum (centimes)</span><input name="minimumAmount" type="number" /></label>
          <label><span>Montant suggéré (centimes)</span><input name="suggestedAmount" type="number" /></label>
          <label><span>Catégorie</span><input name="category" /></label>
          <label><span>SKU</span><input name="sku" /></label>
          <label><span>Stock</span><input name="stock" type="number" /></label>
          <label><span>Poids (g)</span><input name="weightGrams" type="number" /></label>
          <label><span>Quantité max</span><input name="maxQuantity" type="number" /></label>
          <label><span>Montant livraison (centimes)</span><input name="shippingFeeAmount" type="number" /></label>

          <label><span><input name="isFeatured" type="checkbox" /> Offre mise en avant sur l’accueil</span></label>
          <label><span><input name="isActive" type="checkbox" defaultChecked /> Active</span></label>
          <label><span><input name="isPhysical" type="checkbox" /> Produit physique</span></label>
          <label><span><input name="requiresShipping" type="checkbox" /> Livraison requise</span></label>

          <button className="button primary" type="submit">Créer l’offre</button>
        </form>
      </section>

      <section className="panel table-wrap">
        <h2>Offres existantes</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Type</th>
              <th>Prix</th>
              <th>Livraison</th>
              <th>Mise en avant</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.title}</td>
                <td>{product.offerType}</td>
                <td>
                  {product.pricingMode === "fixed"
                    ? `${product.fixedPrice} cts`
                    : `min ${product.minimumAmount} cts`}
                </td>
                <td>
                  {product.requiresShipping
                    ? `${product.shippingFeeAmount || 0} cts`
                    : "-"}
                </td>
                <td>{product.isFeatured ? "Oui" : "Non"}</td>
                <td>{product.isActive ? "Actif" : "Inactif"}</td>
                <td><a className="button ghost small" href={`/admin/products/${product.id}`}>Modifier</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}