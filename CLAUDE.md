# Pointage 7h : notes pour Claude Code

Réponds toujours à l'utilisateur **en français**. Le texte de l'interface est en français. Le code,
les identifiants et les messages de commit sont en anglais.

## Le projet en bref

Appli personnelle de suivi d'horaires variables pour un apprenti (TP AIS, promotion 2026) qui doit
faire **35h par semaine, soit 7h par jour**. Elle remplace un site de calcul d'heures que
l'utilisateur ouvrait plusieurs fois par jour. Elle répond à trois questions :

1. Combien de temps me reste-t-il avant de pouvoir partir aujourd'hui, et à quelle heure ?
2. Suis-je en positif ou en négatif sur le mois ?
3. Quels jours suis-je en cours cette semaine et la suivante ?

Le contexte produit complet est dans `PRODUCT.md`.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.src.html` | Toute l'appli (HTML, CSS, JS, sans framework). C'est aussi le fichier publié tel quel en artefact Claude : pas de `<!doctype>`, `<html>`, `<head>` ni `<body>`, l'artefact les ajoute. |
| `build.mjs` | Génère `dist/index.html` pour Vercel : ajoute le squelette HTML et injecte `window.POINTAGE_CONFIG` depuis `SUPABASE_URL` et `SUPABASE_ANON_KEY`. Le build échoue si ces variables manquent. |
| `vercel.json` | Build `node build.mjs`, sortie `dist/`, en-têtes `noindex` et anti-iframe. |
| `supabase/schema.sql` | Table `pointage_docs` (un document JSON par utilisateur et par nom) avec RLS : chacun ne voit que ses lignes. Active aussi le temps réel. |
| `design/` | Maquettes et anciennes versions (voir l'historique plus bas). Ne sont pas déployées. |
| `scripts/weekly-email.mjs` et `.github/workflows/weekly-email.yml` | Rappel du vendredi : lit `PLAN_COURS` et `PLAN_EXAMS` dans `index.src.html`, et envoie un e-mail HTML (thème Mélange doux, tableaux et styles en ligne) par le SMTP de Gmail quand la semaine suivante sort de l'habitude jeudi-vendredi. Secrets : `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `MAIL_TO` (facultatif) ; variable `APP_URL`. |
| `docs/planning-tp-ais.pdf` | Planning prévisionnel du centre de formation, source des jours de cours codés dans l'appli. |
| `.agents/skills/impeccable` (lien dans `.claude/skills/`) | Skill de design « impeccable » (pbakaus/impeccable), installé avec `npx skills add`. |

## Stockage des données (3 modes, choisis au démarrage dans `boot()`)

1. **Supabase** quand `window.POINTAGE_CONFIG` existe (version Vercel) : écran de connexion par
   e-mail et mot de passe, données dans `pointage_docs`, temps réel et rechargement au retour sur l'onglet.
2. **Compte Claude** dans l'artefact : capacité `db` sous `data/users/<id>/`, documents `settings` et `m-AAAA-MM`.
3. **Cet appareil** (`localStorage`, clé `pointage7h.v1`) sinon. Ce cache est aussi utilisé dans les deux autres modes.

Format : `settings` contient les réglages, `m-AAAA-MM` contient `{ days: { "AAAA-MM-JJ": { type?, in?, ps?, pe?, out? } }, adj }`.
`type` n'est stocké que s'il diffère du type par défaut du jour.

## Règles métier (validées par l'utilisateur)

- **Objectif** : 7h00 par jour, donc 35h par semaine (réglage `target`, 420 min).
- **Entreprise** : arrivée entre 8h00 et 8h30. Le temps avant 8h00 ne compte pas, sauf si le réglage
  le permet. Pause par défaut de 12h15 à 13h00, mais c'est l'heure de reprise réelle qui compte
  (13h05 donne 50 min de pause). Départ au plus tôt 15h45, sans maximum.
- **Horaire type depuis octobre 2026** : 8h00–12h15 puis 13h00–15h45, soit 7h00 pile. L'ancien
  horaire, départ à 16h00, faisait 7h15 par jour et dépassait les 35h par semaine.
- **Cours** : 9h–12h et 13h–17h au centre de formation, soit 7h00 (réglage `coursMinutes`, 420).
  Un jour de cours ou d'examen compte `coursMinutes`, et l'écart avec l'objectif va dans le solde.
- **Planning TP AIS** (août 2026 à septembre 2027) codé dans `PLAN_COURS` et `PLAN_EXAMS`.
  Les cours tombent en général le jeudi et le vendredi, parfois le lundi et le mardi. Un bandeau
  prévient quand la semaine en cours ou la suivante sort de l'habitude. Le réglage `usePlanning`
  permet de le couper.
- **Fériés** : les 11 fériés français, plus le Vendredi saint et la Saint-Étienne (l'entreprise est
  en Alsace-Moselle). Chacun peut être déclaré chômé ou non dans les réglages. Le 1er mai est
  toujours chômé, et le lundi de Pentecôte est non chômé par défaut. Un férié chômé compte 7h.
- **Solde** : remis à 0 chaque mois, avec un champ « Ajustement du mois ». Un jour travaillé sans
  départ réel, ou un jour passé vide, ne compte pas.
- **Prévisions** : départ pour faire 7h, et départ pour remettre le mois à 0, jamais avant 15h45.
- **Le trône (fonction cachée, pour rire)** : compteur du temps passé aux toilettes. On l'ouvre en
  tapant `w` puis `c` hors d'un champ, ou en touchant 5 fois le logo « Pointage 7h ». Il propose un
  chrono « J'y vais » / « Je reviens », des ajouts rapides et des statistiques (année, mois, jour,
  passages, moyenne). Ses données sont dans un document à part (`wc` : `{ entries: [{ t, m }], running, since }`),
  synchronisé comme le reste. Il couvre l'année d'alternance, du 1er octobre 2026 au 30 septembre
  2027 (`ALT_FROM` et `ALT_TO`), et affiche un « bilan final » une fois la période terminée. Il ne doit
  **jamais** être remis à zéro, ni par le changement de mois ni par l'ajustement. Aucun lien visible ne doit y mener.
- **Départ réel** : l'utilisateur part souvent sans pointer. Le lendemain, un bandeau lui demande
  l'heure de départ, préremplie avec l'heure prévue.

## Design actuel : « Mélange doux »

- Fond `#eef0ec`, cartes blanches très arrondies, une seule couleur vive (bleu `#2f45c9`). Vert
  pour le positif, violet pour les cours, ambre pour la pause. Mode sombre dédié.
- Polices : Unbounded pour les chiffres et les titres, Figtree pour le texte.
- Téléphone : une colonne, avec une barre d'onglets en pilule en bas.
- PC (≥ 1024px) : rail latéral à gauche. La Journée est un tableau de bord : au centre le compte à
  rebours, la barre horaire et « Tes horaires » ; à droite l'alerte de cours, la semaine et le mois.
- Le compte à rebours géant est l'élément principal. Juste en dessous : « avant de pouvoir partir »,
  puis la pastille « Départ prévu à 16h05 ». L'utilisateur a refusé le départ en « sticker » penché.
- Toujours visibles sur la Journée : Arrivée, Pause (début et fin), Départ prévu, Départ réel (« à compléter » en pointillés).
- L'utilisateur rejette les écrans encombrés.

## Historique

1. **V1** : premier calculateur (cartes, tableaux), publié en artefact.
2. **V2 et V3** : « carte de pointage » avec onglets, compte à rebours géant, ruban horaire, semaines
   à faire glisser, graphique du mois. Affinée avec les skills frontend-design et Emil Kowalski.
   Sauvegardée dans `design/v3-carte-de-pointage.html`.
3. **Planning TP AIS** lu dans le PDF (cases rouges) et intégré, avec le bandeau des cours qui changent.
4. **Pistes de design** comparées (`design/comparatif*.html`). « Mélange doux » a été retenu, puis
   la mise en page PC « Rail latéral et tableau de bord » (`design/pc-melange-doux.html`).
   L'état juste avant la refonte est dans `design/v4-avant-melange-doux.html`.
5. **Refonte Mélange doux**, fériés Alsace-Moselle, heures de cours réglables. C'est la version actuelle.

Artefacts Claude :
- appli : https://claude.ai/artifact/NsSqhcnQovdHwS4X2dreiW
- ancien style : https://claude.ai/artifact/46c2nofH2F1wzcpb69D6pE
- pistes : https://claude.ai/artifact/RWjwJs9EvjcRd7QUgQgi5m
- PC : https://claude.ai/artifact/CryDJpP9HCoP5ErpAe7TyU

## À faire ou en attente

- Déploiement : créer le projet Supabase, lancer `supabase/schema.sql`, importer le dépôt dans
  Vercel avec `SUPABASE_URL` et `SUPABASE_ANON_KEY`, créer le compte, puis désactiver les
  inscriptions. Les étapes sont dans le README.
- Rappel e-mail du vendredi : le code est en place. Il reste à créer le mot de passe d'application
  Gmail et les secrets GitHub (voir le README). Si tu modifies le format de `PLAN_COURS` ou
  `PLAN_EXAMS`, garde-le en JSON valide : le script le lit directement.
- Idées proposées : installation sur le téléphone (PWA), notifications de départ, export mensuel
  pour l'entreprise, demi-journées, statistiques.

## Vérifier un changement

Il n'y a pas de tests automatiques. Pour vérifier un changement :

1. Vérifie que le script se compile :
   `node -e "const s=require('fs').readFileSync('index.src.html','utf8');new Function(s.match(/<script>([\s\S]*)<\/script>/)[1])"`
2. Ouvre une copie entourée de `<!doctype html>` dans Playwright, sur téléphone (390px) et sur PC
   (1280–1440px), en clair et en sombre. L'horloge se fige avec `page.clock.install`, et des
   données d'exemple se mettent dans `localStorage` sous `pointage7h.v1`.

Attention : sans doctype, le navigateur passe en mode « quirks » et ignore la casse des classes CSS.
