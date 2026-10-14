// Weekly reminder: every Friday, emails the coming week's schedule when the training days
// differ from the usual ones (Thursday and Friday). The schedule is read from index.src.html
// so the app stays the single source of truth.
//
// Usage:
//   node scripts/weekly-email.mjs                    send if next week is unusual
//   node scripts/weekly-email.mjs --force            send even if next week is usual
//   node scripts/weekly-email.mjs --preview out.html write the email to a file, send nothing
//   node scripts/weekly-email.mjs --date 2026-10-16  pretend today is this date
//
// Environment: GMAIL_USER, GMAIL_APP_PASSWORD, MAIL_TO (defaults to GMAIL_USER), APP_URL (optional).
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const flag = name => args.includes(name);
const option = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };

/* ---------- Schedule from the app ---------- */
const src = readFileSync(new URL("../index.src.html", import.meta.url), "utf8");
const grab = re => { const m = re.exec(src); if (!m) throw new Error("Schedule not found in index.src.html: " + re); return m[1]; };
const PLAN_COURS = JSON.parse(grab(/const PLAN_COURS = (\{[\s\S]*?\});/));
const PLAN_EXAMS = JSON.parse(grab(/const PLAN_EXAMS = (\[[^\]]*\]);/));
const [PLAN_FROM, PLAN_TO] = [...grab(/const PLAN_FROM = ("[^"]+", PLAN_TO = "[^"]+")/).matchAll(/"([^"]+)"/g)].map(m => m[1]);
const HABIT = [4, 5]; // Thursday, Friday

/* ---------- Dates ---------- */
const pad = n => String(n).padStart(2, "0");
const keyOf = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const addDays = (d, n) => new Date(d.getTime() + n * 864e5);
const parisToday = () => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return new Date(parts + "T00:00:00Z");
};
const today = option("--date") ? new Date(option("--date") + "T00:00:00Z") : parisToday();
const nextMonday = addDays(today, ((8 - today.getUTCDay()) % 7) || 7);
const DAY = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MON3 = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/* ---------- Public holidays (France + Alsace-Moselle, app defaults) ---------- */
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), n = h + l - 7 * m + 114;
  return new Date(Date.UTC(y, Math.floor(n / 31) - 1, (n % 31) + 1));
}
function holidays(y) {
  const e = easter(y), D = (m, d) => new Date(Date.UTC(y, m, d));
  return {
    [keyOf(D(0, 1))]: "Jour de l'an", [keyOf(addDays(e, -2))]: "Vendredi saint", [keyOf(addDays(e, 1))]: "Lundi de Pâques",
    [keyOf(D(4, 1))]: "Fête du Travail", [keyOf(D(4, 8))]: "Victoire 1945", [keyOf(addDays(e, 39))]: "Ascension",
    [keyOf(D(6, 14))]: "Fête nationale", [keyOf(D(7, 15))]: "Assomption", [keyOf(D(10, 1))]: "Toussaint",
    [keyOf(D(10, 11))]: "Armistice 1918", [keyOf(D(11, 25))]: "Noël", [keyOf(D(11, 26))]: "Saint-Étienne"
  }; // Lundi de Pentecôte is a working day by default in the app
}

/* ---------- Next week ---------- */
const week = [0, 1, 2, 3, 4].map(n => {
  const d = addDays(nextMonday, n), k = keyOf(d), hol = holidays(d.getUTCFullYear())[k];
  const inPlan = k >= PLAN_FROM && k <= PLAN_TO;
  const type = hol ? "ferie" : PLAN_EXAMS.includes(k) ? "exam" : (inPlan ? (PLAN_COURS[k.slice(0, 7)] || []).includes(d.getUTCDate()) : HABIT.includes(d.getUTCDay())) ? "cours" : "work";
  return { d, k, type, hol };
});
const coursDays = week.filter(w => w.type === "cours" || w.type === "exam");
const got = coursDays.map(w => w.d.getUTCDay());
const unusual = got.join() !== HABIT.join();
const names = arr => arr.map(w => DAY[w]).join(" et ");
const fri = week[4].d;
const range = `${nextMonday.getUTCDate()}${nextMonday.getUTCMonth() !== fri.getUTCMonth() ? " " + MONTHS[nextMonday.getUTCMonth()] : ""} au ${fri.getUTCDate()} ${MONTHS[fri.getUTCMonth()]}`;
const hasExam = coursDays.some(w => w.type === "exam");
const headline = !coursDays.length ? "Pas de cours la semaine prochaine"
  : hasExam ? `Examens ${names(got)}`
  : `Cours ${names(got)}`;
const detail = !coursDays.length ? "Cinq jours en entreprise, au lieu de trois plus deux jours de cours."
  : `Au lieu de ${names(HABIT)} comme d'habitude.`;

/* ---------- Email (Mélange doux, tables + inline styles for mail clients) ---------- */
const C = { bg: "#eef0ec", card: "#ffffff", ink: "#111a16", muted: "#5c6862", accent: "#2f45c9", accentSoft: "#e2e6fb", cours: "#6a3fb8", coursSoft: "#ece4f8", ferieSoft: "#f1e8cf", ferie: "#8c6a12", sunk: "#eef0ec" };
const display = `'Unbounded','Segoe UI',Arial,sans-serif`, body = `'Figtree','Segoe UI',Arial,sans-serif`;
const LABEL = { work: "Entreprise", cours: "Cours", exam: "Examen", ferie: "Férié" };
const STYLE = {
  work: `background:${C.sunk};color:${C.ink};`,
  cours: `background:${C.coursSoft};color:${C.cours};`,
  exam: `background:${C.coursSoft};color:${C.cours};`,
  ferie: `background:${C.ferieSoft};color:${C.ferie};`
};
const appUrl = process.env.APP_URL || "";
const dayCells = week.map(w => `
      <td width="20%" style="padding:0 3px;" valign="top">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius:16px;${STYLE[w.type]}">
          <tr><td style="padding:12px 4px 4px;text-align:center;font-family:${display};font-weight:600;font-size:15px;">${DAY[w.d.getUTCDay()].slice(0, 3).replace(/^./, c => c.toUpperCase())}</td></tr>
          <tr><td style="padding:0 4px 4px;text-align:center;font-family:${body};font-size:12px;opacity:.75;">${w.d.getUTCDate()} ${MON3[w.d.getUTCMonth()]}</td></tr>
          <tr><td style="padding:2px 4px 12px;text-align:center;font-family:${body};font-weight:700;font-size:12px;">${LABEL[w.type]}</td></tr>
        </table>
      </td>`).join("");

const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${headline}</title>
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@600;800&family=Figtree:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;">${headline}, semaine du ${range}. ${detail}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.bg};">
  <tr><td align="center" style="padding:28px 14px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">
      <tr><td style="padding:0 6px 16px;font-family:${display};font-weight:600;font-size:16px;color:${C.ink};">
        <span style="display:inline-block;width:11px;height:11px;border-radius:4px;background:${C.accent};margin-right:8px;"></span>Pointage 7h
      </td></tr>
      <tr><td style="background:${C.card};border-radius:26px;padding:26px 22px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="font-family:${body};font-size:14px;color:${C.muted};padding-bottom:6px;">Semaine du ${range}</td></tr>
          <tr><td style="font-family:${display};font-weight:800;font-size:30px;line-height:1.1;letter-spacing:-1px;color:${C.ink};padding-bottom:10px;">${headline}</td></tr>
          <tr><td style="padding-bottom:20px;">
            <span style="display:inline-block;background:${C.coursSoft};color:${C.cours};border-radius:999px;padding:7px 14px;font-family:${body};font-weight:700;font-size:14px;">${detail}</span>
          </td></tr>
          <tr><td><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>${dayCells}
          </tr></table></td></tr>
          ${week.some(w => w.hol) ? `<tr><td style="padding-top:16px;font-family:${body};font-size:13px;color:${C.muted};">Férié : ${week.filter(w => w.hol).map(w => `${DAY[w.d.getUTCDay()]} ${w.d.getUTCDate()}, ${w.hol}`).join(" ; ")}.</td></tr>` : ""}
          <tr><td style="padding-top:20px;font-family:${body};font-size:14px;line-height:1.5;color:${C.ink};">
            Les jours de cours sont déjà remplis dans l'appli et comptent 7h00. En entreprise, l'horaire type reste 8h00–12h15 puis 13h00–15h45.
          </td></tr>
          ${appUrl ? `<tr><td style="padding-top:22px;">
            <a href="${appUrl}" style="display:block;background:${C.ink};color:#ffffff;text-decoration:none;border-radius:999px;padding:15px 20px;text-align:center;font-family:${body};font-weight:700;font-size:15px;">Ouvrir Pointage 7h</a>
          </td></tr>` : ""}
        </table>
      </td></tr>
      <tr><td style="padding:16px 6px 0;font-family:${body};font-size:12px;color:${C.muted};line-height:1.5;">
        Envoyé le vendredi quand tes jours de cours changent. Source : planning TP AIS, promotion 2026.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

const text = `${headline}, semaine du ${range}.
${detail}
${week.map(w => `- ${DAY[w.d.getUTCDay()]} ${w.d.getUTCDate()} : ${LABEL[w.type]}${w.hol ? " (" + w.hol + ")" : ""}`).join("\n")}
${appUrl ? "\n" + appUrl : ""}`;

/* ---------- Output ---------- */
const preview = option("--preview");
if (preview) { writeFileSync(preview, html); console.log(`Preview written to ${preview} (${unusual ? "unusual week" : "usual week"}).`); process.exit(0); }
if (!unusual && !flag("--force")) { console.log(`Week of ${range}: usual training days, no email.`); process.exit(0); }

const { GMAIL_USER, GMAIL_APP_PASSWORD, MAIL_TO } = process.env;
if (!GMAIL_USER || !GMAIL_APP_PASSWORD) { console.error("GMAIL_USER and GMAIL_APP_PASSWORD are required."); process.exit(1); }
const { default: nodemailer } = await import("nodemailer");
const transport = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } });
await transport.sendMail({ from: `Pointage 7h <${GMAIL_USER}>`, to: MAIL_TO || GMAIL_USER, subject: `${headline} (semaine du ${range})`, text, html });
console.log(`Email sent for the week of ${range}.`);
