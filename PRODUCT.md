# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static single-file HTML/CSS/JS (`index.src.html`). Published as a Claude artifact (Claude account storage) and deployed on Vercel with Supabase (email + password auth, Postgres with row-level security). No framework.

## Users

One person: a work-study employee (alternance) on flexible hours who must log 7h per working day. Uses it equally on phone (quick glances when arriving, at lunch, before leaving) and on a PC tab open during the day. French-speaking; the whole interface is in French.

## Product Purpose

Replace repeated trips to a generic hour-calculator website. At any moment answer: how long until I can leave today, at what time, and am I ahead or behind for the month. Success: one glance gives the departure time; the month balance is always known.

## Positioning

Knows this user's real rules: arrival window 8h00–8h30, minimum departure 15h45, lunch break 12h15–13h00 by default with late returns counted, two variable school days per week (Thu+Fri by default, sometimes Mon+Tue) counted as 7h, French public holidays with a per-holiday "chômé" setting, monthly balance reset.

## Operating Context

Punches four times a day: arrival, lunch start, lunch end, departure. Plans school days week by week. Checks the month balance to decide whether to leave earlier or later.

## Capabilities and Constraints

- Day: live countdown to departure, departure for exactly 7h, departure to bring the month back to 0 (never before 15h45), one-tap punch buttons plus manual time edits, day type (work, school, leave, public holiday off), warnings (late arrival, early departure).
- Day timeline ribbon from 7h30 to 18h30 (worked, break, forecast, departure marker).
- Weeks: swipeable week carousel, school-day presets per week.
- Month: positive/negative balance, cumulative balance chart, stats, manual adjustment, list of days, holidays.
- Settings: hours rules, default school days, public holidays off, backup copy/import, account (Supabase mode).
- Must stay uncluttered: the user rejects a crowded screen. Must keep: giant countdown, day ribbon, swipeable weeks, month chart. User welcomes additional relevant pages.
- Before 8h00 does not count unless the setting is on. Past days left empty do not count.

## Evidence on Hand

Only the user's own hours. No testimonials, no other users. Example data used in screenshots is synthetic.

## Product Principles

1. The departure time is the answer; everything else is secondary.
2. A glance must be enough, on phone and desktop alike.
3. Never crowded: one job per screen.
4. The user's own rules, never generic ones.
5. Private by default.

## Accessibility & Inclusion

French UI, readable at a glance, works in light and dark, keyboard and touch.
