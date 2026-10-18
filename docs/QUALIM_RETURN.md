# Retour automatique après la commande du livre papier 365

## Parcours

Quali-M ouvre dans le même onglet :
`https://www.solidaritecoeuractif.com/partenaires/qualim/365`.

Cette entrée retrouve le produit actif `prod_book_365` et mène à sa fiche actuelle.
Un cookie HttpOnly, Secure en HTTPS, SameSite=Lax, limité à deux heures mémorise
ce parcours. Au checkout, seuls les paniers contenant ce livre et ce marqueur
peuvent recevoir les métadonnées Stripe `returnPartner=qualim`.

Lorsque le retour est activé, Stripe revient sur
`/api/checkout/retour-qualim?session_id={CHECKOUT_SESSION_ID}`.
Le serveur vérifie la session auprès de Stripe, son origine Quali-M, le livre,
la référence et l'identifiant de session de la commande enregistrée.
Il attend à la fois le paiement Stripe `paid`, la session `complete` et la
commande interne `paid`, puis effectue une redirection HTTP 303 immédiate vers :

`https://quali-m-consult.com/boutique?retour=365`

Aucune ouverture de fenêtre, aucun bouton « rester », aucune donnée de commande
transmise à Quali-M. Le referrer est supprimé. Une notification webhook retardée
entraîne une actualisation automatique toutes les cinq secondes (cinq minutes
maximum), jamais une fausse confirmation. Une annulation ne déclenche pas le retour.
Les sessions directes SCA et la billetterie restent inchangées.
Les emails, reçus, montants et écritures de commande restent dans le circuit existant.

## Mise en service

Le 18 octobre 2026, le domaine Quali-M affiche encore la page Hostinger en attente
de publication. Le retour est donc **désactivé par défaut** :
`QUALIM_RETURN_ENABLED` absent ou différent de `true`.

1. Préparer dans Hostinger le lien partenaire ci-dessus et `/boutique?retour=365`.
   Cette route doit afficher la boutique réelle, avec les autres livres Quali-M
   visibles et leurs prix administrés, sans réexpédier le visiteur vers SCA.
2. Publier Quali-M après validation de sa boutique et vérifier la destination
   publiquement, sur ordinateur et mobile.
3. Définir `QUALIM_RETURN_ENABLED=true` dans le projet SCA, environnement production,
   puis redéployer le commit validé. Le réglage s'applique aux nouvelles sessions.
4. Vérifier le parcours avec un paiement de test dans un environnement isolé.
   Aucun paiement réel ni email client n'est nécessaire pour les tests automatisés.

Retour arrière : remettre ce réglage à `false` et redéployer. Les sessions déjà
créées passent alors par la confirmation SCA après vérification du paiement.

## Validation automatisée

`node --test scripts/test-qualim-return.cjs`

Les tests utilisent des sessions et commandes fictives, sans appel Stripe ni
écriture de commande. Ils couvrent le retour payé, les visiteurs directs, les
produits hors périmètre, l'annulation, les paiements incomplets, les retards du
webhook, les erreurs temporaires, les tentatives de redirection externe et le
cookie de la route d'entrée.
