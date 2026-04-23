import Link from "next/link";
import { notFound } from "next/navigation";
import { storage } from "@/lib/storage";

function gramsToKg(value?: number) {
  if (!value || value <= 0) return "";
  return String(value / 1000);
}

export default async function ProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await storage().getProductById(id);
  if (!product) notFound();

  return (
    <main className="admin-wrap">
      <div className="actions-row">
        <Link href="/admin/products" className="button secondary small">
          Retour
        </Link>
      </div>

      <section className="panel">
        <h1>Modifier l’offre</h1>
        <form
          action={`/api/products/${product.id}`}
          method="post"
          encType="multipart/form-data"
          className="form-grid"
        >
          <input type="hidden" name="_method" value="put" />

          <label>
            <span>Titre</span>
            <input name="title" defaultValue={product.title} required />
          </label>

          <label>
            <span>Sous-titre</span>
            <input name="subtitle" defaultValue={product.subtitle} />
          </label>

          <label className="full">
            <span>Description courte</span>
            <textarea
              name="shortDescription"
              defaultValue={product.shortDescription}
              required
            />
          </label>

          <label className="full">
            <span>Description longue</span>
            <textarea
              name="longDescription"
              defaultValue={product.longDescription}
              required
            />
          </label>

          <label>
            <span>Image (fichier)</span>
            <input name="imageFile" type="file" accept="image/*" />
          </label>

          {product.image ? (
            <div className="full">
              <img
                src={product.image}
                alt={product.title}
                className="product-image"
                style={{ maxWidth: 220 }}
              />
            </div>
          ) : null}

          <label>
            <span>Type d’offre</span>
            <select name="offerType" defaultValue={product.offerType}>
              <option value="product">Produit</option>
              <option value="donation">Don</option>
              <option value="campaign">Collecte</option>
              <option value="participation">Participation</option>
            </select>
          </label>

          <label>
            <span>Mode de prix</span>
            <select name="pricingMode" defaultValue={product.pricingMode}>
              <option value="fixed">Prix fixe</option>
              <option value="flexible">Montant libre</option>
            </select>
          </label>

          <label>
            <span>Prix fixe (centimes)</span>
            <input
              name="fixedPrice"
              type="number"
              defaultValue={product.fixedPrice}
            />
          </label>

          <label>
            <span>Minimum métropole (centimes)</span>
            <input
              name="minimumAmount"
              type="number"
              defaultValue={product.minimumAmount}
            />
          </label>

          <label>
            <span>Minimum Outre-Mer (centimes)</span>
            <input
              name="minimumAmountOutreMer"
              type="number"
              defaultValue={product.minimumAmountOutreMer}
            />
          </label>

          <label>
            <span>Minimum International (centimes)</span>
            <input
              name="minimumAmountInternational"
              type="number"
              defaultValue={product.minimumAmountInternational}
            />
          </label>

          <label>
            <span>Montant suggéré (centimes)</span>
            <input
              name="suggestedAmount"
              type="number"
              defaultValue={product.suggestedAmount}
            />
          </label>

          <label>
            <span>Catégorie</span>
            <input name="category" defaultValue={product.category} />
          </label>

          <label>
            <span>SKU</span>
            <input name="sku" defaultValue={product.sku} />
          </label>

          <label>
            <span>Stock</span>
            <input name="stock" type="number" defaultValue={product.stock} />
          </label>

          <label>
            <span>Poids (kg)</span>
            <input
              name="weightKg"
              type="number"
              step="0.001"
              min="0"
              defaultValue={gramsToKg(product.weightGrams)}
            />
          </label>

          <label>
            <span>Quantité max</span>
            <input
              name="maxQuantity"
              type="number"
              defaultValue={product.maxQuantity}
            />
          </label>

          <label>
            <span>Montant livraison (centimes)</span>
            <input
              name="shippingFeeAmount"
              type="number"
              defaultValue={product.shippingFeeAmount}
            />
          </label>

          <label>
            <span>
              <input
                name="isFeatured"
                type="checkbox"
                defaultChecked={Boolean(product.isFeatured)}
              />{" "}
              Offre mise en avant sur l’accueil
            </span>
          </label>

          <label>
            <span>
              <input
                name="isActive"
                type="checkbox"
                defaultChecked={product.isActive}
              />{" "}
              Active
            </span>
          </label>

          <label>
            <span>
              <input
                name="isPhysical"
                type="checkbox"
                defaultChecked={product.isPhysical}
              />{" "}
              Produit physique
            </span>
          </label>

          <label>
            <span>
              <input
                name="requiresShipping"
                type="checkbox"
                defaultChecked={product.requiresShipping}
              />{" "}
              Livraison requise
            </span>
          </label>

          <div className="actions-row">
            <button className="button primary" type="submit">
              Enregistrer
            </button>
            <button
              className="button ghost"
              formAction={`/api/products/${product.id}?_method=delete`}
              type="submit"
            >
              Supprimer
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}