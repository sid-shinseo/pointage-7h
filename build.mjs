// Builds dist/index.html from index.src.html and injects the Supabase config
// from the SUPABASE_URL and SUPABASE_ANON_KEY environment variables.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL et SUPABASE_ANON_KEY sont obligatoires (variables d'environnement Vercel).");
  process.exit(1);
}

const body = readFileSync(new URL("./index.src.html", import.meta.url), "utf8");
const config = `<script>window.POINTAGE_CONFIG=${JSON.stringify({ supabaseUrl: url, supabaseAnonKey: key })};</script>`;
const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
${config}
</head>
<body>
${body}
</body>
</html>
`;
mkdirSync(new URL("./dist/", import.meta.url), { recursive: true });
writeFileSync(new URL("./dist/index.html", import.meta.url), html);
console.log("dist/index.html généré");
