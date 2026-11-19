-- Trois premiers guides publiés (modifiables ou supprimables depuis l'admin). ON CONFLICT : jamais d'écrasement d'un article existant.
INSERT INTO blog_post (slug, title, excerpt, content, category, cover_alt, meta_title, meta_description, keywords, read_minutes, published, published_at, created_at, updated_at)
VALUES
('reprise-or-ancien-calculer-prix-juste',
 'Reprise d’or ancien : calculer un prix juste en 4 étapes',
 'Peser, identifier le carat, déduire la perte, appliquer le prix du jour : la méthode complète pour racheter un bijou ancien, avec un exemple chiffré.',
 $md$Un client pose une vieille gourmette sur le comptoir. Ce qu'il en tirera dépend de quatre gestes : bien les faire, c'est un prix que vous pouvez défendre, et un client qui revient.

## 1. Peser le bijou : le poids brut

Pesez sur une balance de bijouterie précise au centième de gramme, **devant le client**. Notez le **poids brut** tel quel, fermoir et soudures compris. S'il y a des pierres que vous pouvez retirer, retirez-les avant de peser ; sinon, vous en tiendrez compte à l'étape 3.

## 2. Identifier le carat

Cherchez le poinçon, puis confirmez avec votre méthode habituelle de test (pierre de touche, acide ou testeur électronique). Le carat indique la part d'or pur dans le métal :

- **18K** : 18 / 24 = 75 % d'or pur (titre 750 ‰)
- **21K** : 21 / 24 = 87,5 % d'or pur (titre 875 ‰)
- **24K** : 24 / 24, soit environ 100 % (titre 999 ‰)

Un doute sur le carat ? Rachetez au carat inférieur ou refusez : c'est la seule erreur qu'on ne rattrape pas après la fonte.

## 3. Déduire la perte : le poids net

Le métal perd un peu à la fonte, et les pierres ou les soudures ne sont pas de l'or. On applique donc une **déduction**, le plus souvent de quelques pour cent selon l'état du bijou. Annoncez-la au client avant de calculer.

> Poids net = poids brut × (1 − déduction)

## 4. Appliquer le prix d'achat du jour

Multipliez le poids net par votre **prix d'achat du jour** pour ce carat (en DH/g) : celui que vous avez saisi ce matin, pas celui de la veille.

> Montant à verser = poids net × prix d'achat du jour

### Exemple chiffré (prix fictif, pour le calcul)

- Bracelet 18K, poids brut : 12,00 g
- Déduction : 3 %
- Poids net : 12,00 × 0,97 = **11,64 g**
- Prix d'achat 18K (exemple) : 400 DH/g
- À verser : 11,64 × 400 = **4 656 DH**

Utilisez toujours votre propre prix du jour : les chiffres ci-dessus ne servent qu'à montrer la méthode.

## Les erreurs qui coûtent cher

- Utiliser le prix d'hier : sur un marché qui bouge, l'écart se paie à chaque gramme.
- Confondre prix de vente et prix d'achat du jour : ce n'est pas le même chiffre.
- Arrondir le poids avant la déduction au lieu d'après.
- Ne garder aucune trace : sans reçu, impossible de justifier le prix plus tard.

## Reprise lors d'un échange

Quand le client repart avec un nouveau bijou, la reprise s'**ajoute au même reçu** : le montant de l'or ancien est déduit du prix du nouveau bijou, et le client ne paie que la différence. Faites toujours apparaître le poids net et le prix du jour sur le reçu : c'est ce qui évite les discussions.

## Dans Orgest

L'écran **Achat d'or** fait ces quatre étapes pour vous : choisissez le carat, saisissez le poids brut et la déduction, et le montant s'affiche avec le prix du jour. Dans une **Vente** ou un **Échange**, activez « Reprise d'or ancien » : le montant est déduit du total à payer et figure sur le reçu. Voir aussi notre guide sur [les carats 18K, 21K et 24K](/blog/carat-18k-21k-24k-prix-par-gramme).$md$,
 'Caisse et ventes', 'Pesée d’un bracelet en or sur une balance de bijouterie',
 'Reprise d’or ancien : calculer le prix en 4 étapes',
 'Comment racheter de l’or ancien au juste prix : pesée, carat, déduction de la perte et prix du jour. Méthode complète avec un exemple chiffré pour bijoutiers.',
 'reprise or ancien, rachat or, calcul poids net, prix du gramme, bijouterie maroc', 6, TRUE, now() - interval '6 days', now() - interval '6 days', now() - interval '6 days'),

('carat-18k-21k-24k-prix-par-gramme',
 '18K, 21K, 24K : ce que chaque carat change pour votre prix au gramme',
 'Titre, or pur, prix au gramme : comment passer d’un carat à l’autre sans calculatrice, et pourquoi le prix de l’or 24K ne s’applique jamais tel quel à un bijou.',
 $md$Dans une bijouterie, la même question revient chaque jour : « Combien vaut ce gramme en 18K, en 21K ? ». La réponse tient en une proportion, à condition de bien comprendre ce que mesure le carat.

## Le carat, c'est une proportion

Le carat exprime la part d'or pur dans un alliage, sur 24 parts. Un bijou **18K** contient 18 parts d'or pur et 6 parts d'autres métaux (cuivre, argent…) qui lui donnent sa résistance et sa couleur.

- **18K** : 18 / 24 = 75 % d'or pur, titre 750 ‰
- **21K** : 21 / 24 = 87,5 % d'or pur, titre 875 ‰
- **24K** : 24 / 24, soit environ 100 %, titre 999 ‰

## Passer du prix 24K au prix d'un autre carat

Si vous connaissez le prix du gramme d'or pur (24K), la valeur de l'or contenu dans un gramme de bijou s'obtient en multipliant par la proportion :

> Valeur de l'or = prix 24K × (carat / 24)

Exemple fictif, pour le calcul : si le gramme 24K vaut 700 DH, l'or contenu dans un gramme de 18K vaut 700 × 18 / 24 = **525 DH**, et dans un gramme de 21K : 700 × 21 / 24 = **612,50 DH**.

## Pourquoi le prix de vente est différent

La valeur de l'or contenu n'est qu'une base. Votre prix de **vente** ajoute la main d'œuvre, votre marge et parfois la valeur des pierres ; votre prix de **rachat** retire une marge et la perte à la fonte. C'est pourquoi on parle de plusieurs prix pour un même carat :

- **Prix de vente du jour** : ce que paie le client pour un bijou neuf.
- **Prix d'achat du jour** : ce que vous versez pour de l'or repris.
- **Main d'œuvre** : au gramme ou à la pièce, selon le modèle.

## Les trois erreurs fréquentes

- Appliquer le prix 24K à un bijou 18K : l'écart peut atteindre un quart de la valeur.
- Mettre à jour un carat et oublier les autres : changez les trois prix le matin, ensemble.
- Mélanger poids brut et poids net : la reprise se calcule toujours sur le poids net, voir notre guide sur [la reprise d'or ancien](/blog/reprise-or-ancien-calculer-prix-juste).

## Dans Orgest

Chaque carat a son propre **prix du jour** (vente et achat). Orgest calcule le prix d'un bijou à partir de son poids, de son carat et de la main d'œuvre, et vous rappelle quand le prix du jour n'a pas encore été saisi. Plus de calculatrice à la caisse, et le même calcul sur tous les reçus.$md$,
 'Cours de l’or', 'Bijoux en or de différents carats posés sur un comptoir',
 '18K, 21K, 24K : calculer le prix au gramme',
 'Comprendre le carat de l’or : titre, or pur et prix au gramme. Comment passer du prix 24K au prix 18K ou 21K, avec des exemples chiffrés pour bijoutiers.',
 'carat or, 18K 21K 24K, prix gramme or, titre or, calcul prix bijou', 5, TRUE, now() - interval '3 days', now() - interval '3 days', now() - interval '3 days'),

('vente-a-temperament-bijoux-6-regles',
 'Vendre à tempérament sans risque : 6 règles simples pour les bijoutiers',
 'Acompte, durée, échéancier, pièce d’identité, reçu signé et suivi des retards : le minimum à mettre en place avant de laisser partir un bijou en paiement échelonné.',
 $md$La vente à tempérament (paiement en plusieurs mensualités) fait vendre des bijoux qu'un client n'achèterait pas comptant, notamment avant les mariages et les fêtes. Mais un bijou qui part sans cadre peut devenir une créance difficile à récupérer. Voici six règles simples.

## 1. Exiger un acompte

L'acompte réduit votre risque et engage le client. Fixez une règle claire (par exemple une part minimale du prix) et appliquez-la à tout le monde : une règle identique pour tous évite les discussions.

## 2. Limiter la durée

Plus l'échéancier est long, plus le risque de retard augmente, et le cours de l'or peut bouger pendant ce temps. Proposez quelques durées standard plutôt qu'une durée libre.

## 3. Calculer l'échéancier au centime

Divisez le **reste à payer** (prix moins acompte) par le nombre de mois, et gardez les centimes : si la division ne tombe pas juste, les centimes restants s'ajoutent aux premières échéances afin que **le total soit exact**. Un échéancier qui ne retombe pas sur le prix est la première source de litiges.

> Reste à payer = prix − acompte ; mensualité ≈ reste à payer / nombre de mois

Exemple fictif : un bijou à 5 000 DH, acompte de 1 000 DH, 3 mois → reste 4 000 DH, soit 1 333,34 + 1 333,33 + 1 333,33 DH.

## 4. Identifier le client

Notez le nom, le téléphone et, selon votre pratique, une pièce d'identité. Un numéro de téléphone fiable est indispensable pour les rappels.

## 5. Remettre un reçu clair et signé

Le reçu doit montrer le bijou (poids, carat), le prix, l'acompte versé, le nombre d'échéances avec leurs dates et leurs montants. Faites-en signer un exemplaire.

## 6. Suivre les paiements et relancer tôt

Le retard ne se règle pas quand il dure depuis deux mois : il se règle dès le premier jour. Un message poli sur WhatsApp la veille ou le jour de l'échéance suffit dans la plupart des cas.

- Veille de l'échéance : rappel amical.
- Jour J : confirmation et mode de paiement.
- Après le retard : message ferme mais courtois, puis appel.

## Dans Orgest

Orgest calcule l'acompte, le reste à payer et un **échéancier exact au centime**, enregistre chaque paiement, signale les retards sur le tableau de bord et prépare le message de rappel WhatsApp. Vous gardez une vue claire de ce qui vous est dû, client par client.$md$,
 'Ventes à tempérament', 'Vendeur remettant un reçu de paiement échelonné à une cliente',
 'Vente à tempérament : 6 règles pour bijoutiers',
 'Acompte, durée, échéancier au centime, reçu signé et rappels : 6 règles simples pour vendre des bijoux à tempérament sans risque d’impayés.',
 'vente à tempérament, paiement échelonné bijoux, échéancier, impayés bijouterie, rappel whatsapp', 5, TRUE, now() - interval '1 day', now() - interval '1 day', now() - interval '1 day')
ON CONFLICT (slug) DO NOTHING;
