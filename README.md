# Pointage 7h

Suivi de mes horaires variables : temps restant avant de pouvoir partir, heure de départ pour faire 7h,
solde du mois en positif ou en négatif, semaines à faire glisser, jours de cours, congés et jours fériés.

- `index.src.html` : toute l'application (HTML, CSS, JS). C'est aussi le fichier publié en artefact Claude.
- `build.mjs` : génère `dist/index.html` en ajoutant la configuration Supabase.
- `supabase/schema.sql` : table et règles d'accès (chacun ne voit que ses propres heures).
- `design/` : maquettes et anciennes versions, non déployées.
- `CLAUDE.md` : contexte, règles métier et historique pour Claude Code.

## Mise en ligne

### 1. Supabase (connexion + base de données)

1. Crée un projet gratuit sur https://supabase.com.
2. Dans **SQL Editor**, colle le contenu de `supabase/schema.sql` et exécute-le.
3. Dans **Authentication > Sign In / Providers > Email**, garde « Email » activé. Tu peux désactiver
   « Confirm email » si tu ne veux pas de mail de confirmation.
4. Dans **Project Settings > API**, note la **Project URL** et la clé **anon public**.

### 2. Vercel

1. Importe ce dépôt dans Vercel (Add New > Project).
2. Dans **Environment Variables**, ajoute `SUPABASE_URL` et `SUPABASE_ANON_KEY`.
3. Déploie. Le build lance `node build.mjs`.

### 3. Créer ton compte puis fermer les inscriptions

1. Ouvre le site, clique sur « Première fois ? Créer mon compte ».
2. Une fois connecté, retourne dans Supabase : **Authentication > Sign In / Providers**, désactive
   **Allow new users to sign up**. Plus personne ne pourra créer de compte.

La clé « anon » est publique par conception : la sécurité vient des règles RLS du fichier `schema.sql`.
Sans être connecté avec ton compte, on ne peut lire aucune heure.

## Développement local

```sh
SUPABASE_URL=... SUPABASE_ANON_KEY=... node build.mjs
npx serve dist
```

## Rappel par e-mail le vendredi (gratuit)

Chaque vendredi vers 17h (16h en hiver), GitHub Actions (`.github/workflows/weekly-email.yml`)
regarde la semaine suivante dans le planning. Si tes cours ne tombent pas le jeudi et le vendredi
(cours le lundi et le mardi, un seul jour à cause d'un férié, examens, semaine sans cours), il
t'envoie un e-mail aux couleurs de l'appli depuis ton Gmail. Sinon, il n'envoie rien.

Mise en place, une seule fois :

1. Active la validation en deux étapes sur ton compte Google, si ce n'est pas déjà fait.
2. Crée un **mot de passe d'application** sur https://myaccount.google.com/apppasswords
   (nom : « Pointage 7h »). Copie les 16 lettres.
3. Dans GitHub, ouvre `pointage-7h` > **Settings > Secrets and variables > Actions**.
   - Onglet **Secrets**, ajoute `GMAIL_USER` (ton adresse Gmail) et `GMAIL_APP_PASSWORD` (les 16 lettres).
     Tu peux aussi ajouter `MAIL_TO` pour recevoir le mail sur une autre adresse.
   - Onglet **Variables** (facultatif) : `APP_URL` = l'adresse Vercel du site. Le mail affichera alors un bouton « Ouvrir Pointage 7h ».
4. Pour tester : onglet **Actions** > « Weekly training-days email » > **Run workflow**.
   Ce lancement manuel envoie le mail même si la semaine est normale.

Aperçu sans rien envoyer : `npm install` puis `node scripts/weekly-email.mjs --date 2026-10-16 --preview email-preview.html`.
