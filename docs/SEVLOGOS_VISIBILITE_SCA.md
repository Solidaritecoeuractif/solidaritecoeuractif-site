# Solidarité Cœur Actif : visibilité numérique, verrouillée par défaut

Décision du 11 octobre 2026 : ne rien afficher de Sevlogos / numérique sur
la boutique SCA tant qu'une activation manuelle n'est pas explicitement faite.

Le site papier reste identique. Le bloc Sevlogos existe seulement en
développement, sur la fiche du livre imprimé 365. Il n'ajoute ni livre numérique,
ni achat numérique, ni changement de panier, de stocks ou de paiements.

La seule valeur permettant l'affichage est un enregistrement de base
correspondant à ready=true ET enabled=true. Une table absente, un problème de
base, un enregistrement absent ou une valeur false entraînent MASQUÉ.

Pour permettre un jour l'activation manuelle :
1. Faire valider et appliquer la migration additive
   schema/20261011_sevlogos_visibility.sql (elle initialise à false).
2. Vérifier dans l'administration privée /admin/numerique : MASQUÉ.
3. Le jour de la décision, saisir expressément ACTIVER et valider.
4. Un bouton Masquer permet de retirer le lien à nouveau.

Seul l'administrateur SCA disposant d'une session valide peut enregistrer
le choix et la requête doit provenir de la même origine. Aucun
enregistrement de la base de production ne change dans cette PR.

La fiche numérique de destination est celle déjà vérifiée :
https://seve-ten.vercel.app/livres/365-jours-avec-le-seigneur-jesus-christ

Le site SCA en production n'affiche actuellement aucun lien numérique.
La branche PR reste non fusionnée.
