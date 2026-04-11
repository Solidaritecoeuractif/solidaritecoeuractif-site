# Premium Commerce Platform Complete

Plateforme premium en **Next.js** pour gérer :
- produits à prix fixe,
- prix libres avec minimum,
- dons,
- campagnes caritatives,
- panier multi-produits,
- checkout avec **Stripe Checkout**,
- commandes internes,
- exports **CSV / Excel**,
- espace admin,
- statuts logistiques,
- préparation transporteur.

## Point d’architecture le plus important
Le site **n’attend pas Stripe pour posséder les données métier**.

Le flux est le suivant :
1. le client remplit ses informations sur le site ;
2. la commande interne est enregistrée avec le détail client, livraison et lignes de commande ;
3. Stripe Checkout sert uniquement à encaisser le paiement ;
4. le webhook `checkout.session.completed` confirme la commande comme payée ;
5. les exports CSV / Excel partent de la **commande interne du site**, pas des seuls champs Stripe.

C’est ce point qui permet d’exporter proprement même si Stripe n’affiche pas tous les champs dont tu as besoin pour l’exploitation logistique.

## Fonctionnalités couvertes
- catalogue d’offres hybride ;
- panier persistant ;
- quantité multiple par produit ;
- montants libres avec minimum ;
- livraison calculée selon pays et quantité ;
- commande interne sauvegardée avant paiement ;
- webhook Stripe ;
- admin : produits, commandes, statuts ;
- export CSV ;
- export Excel ;
- pages légales ;
- SEO de base ;
- driver JSON ou Postgres.

## Variables d’environnement
Copier `.env.local.example` vers `.env.local` puis renseigner :

- `NEXT_PUBLIC_BASE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CURRENCY`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `STORAGE_DRIVER`
- `DATABASE_URL` si Postgres

## Drivers de stockage
### 1. JSON
- rapide pour démarrer ;
- stockage local dans `data/store.json` ;
- bien pour test, démonstration, petit volume.

### 2. Postgres
- recommandé pour production ;
- schéma SQL fourni dans `schema/postgres.sql` ;
- définir `STORAGE_DRIVER=postgres`.

## Routes principales
- `/` accueil + catalogue
- `/produit/[slug]` fiche produit
- `/panier` panier
- `/commande` checkout
- `/confirmation` confirmation
- `/annulation` annulation
- `/admin` dashboard admin
- `/admin/orders` commandes
- `/admin/products` offres

## Routes API principales
- `POST /api/checkout`
- `POST /api/webhook`
- `POST /api/cart/quote`
- `GET /api/products`
- `POST /api/products`
- `POST /api/products/[id]`
- `GET /api/orders/export/csv`
- `GET /api/orders/export/xlsx`
- `PATCH /api/orders/[reference]`

## Déploiement Vercel
1. pousser le projet sur GitHub ;
2. importer le dépôt dans Vercel ;
3. ajouter les variables d’environnement ;
4. déployer ;
5. créer le webhook Stripe vers `/api/webhook` ;
6. mettre le secret du webhook dans `STRIPE_WEBHOOK_SECRET` ;
7. tester un paiement ;
8. passer à Postgres pour la production.

## Recommandation premium
Pour un usage réel :
- utiliser **Postgres** ;
- brancher des emails transactionnels ;
- ajouter sauvegarde et audit ;
- renforcer la gestion de stock ;
- prévoir ensuite un export Chronopost dédié si tu veux un format 100 % import direct.
