# AGENTS.md: TurfTime

Brief for AI agents working on TurfTime docs, specs or code. Read this first.

## Context

- **Product:** TurfTime, vertical SaaS for sports turfs, box cricket, football 5s/7s, badminton/pickleball/padel courts and gaming cafes.
- **Portfolio:** CraftLayer. Shared platform lives in [`core/`](https://github.com/craftLayer-studio/craftlayer-core/blob/main/README.md). Reference core modules; do not re-specify them.
- **Market:** India first (Tier 1–3 cities), global-ready later. Prices in INR with USD equivalents.
- **Wedge:** QR at the venue plus a shareable link (Instagram bio, WhatsApp groups) opens the venue's own booking page. Players pick a slot, pay an advance by UPI, and get a WhatsApp confirmation. Zero commission.
- **Business goal:** Earn money fast. MVP sellable in 6–8 weeks; first 10 paying venues within 45 days of MVP.

## Reading order

1. [README.md](README.md)
2. [docs/01-product-plan.md](docs/01-product-plan.md)
3. [docs/05-pricing-and-revenue.md](docs/05-pricing-and-revenue.md)
4. [docs/06-go-to-market-and-onboarding.md](docs/06-go-to-market-and-onboarding.md)
5. [docs/04-market-research.md](docs/04-market-research.md)
6. [docs/02-problems-and-benefits.md](docs/02-problems-and-benefits.md), [docs/03-pros-cons-risks.md](docs/03-pros-cons-risks.md)

## Glossary

| Term | Meaning |
|---|---|
| Venue | A physical site (tenant branch) with one or more resources |
| Resource | A bookable unit: pitch, court, box, PC/console station |
| Slot | A time window on a resource (30, 60 or 90 minutes) |
| Hold | A temporary lock (default 7 minutes) on a slot while payment completes |
| Advance | Online part-payment to confirm a booking (for example 30% or ₹500) |
| Balance | Amount collected at the venue after play |
| Split pay | Booking captain shares a link; each player pays their share; slot confirms when the advance is covered |
| Captain | Player who creates the booking and invites others |
| Price rule | Rule that sets slot price by day, time, resource and season (peak, off-peak, weekend, holiday) |
| Fill offer | Automated discount on an empty slot, sent to opted-in past players |
| Pack | Prepaid bundle of slots or hours (for example 10 hours) |
| Marketplace | Third-party player app: Playo, Hudle, KheloMore, Turf Town, District |

## Decisions made

| Decision | Choice | Reason |
|---|---|---|
| Business model | Flat SaaS fee, 0% commission; optional ₹19 per online booking plan | Clear contrast with marketplace commissions; low-risk entry |
| Money flow | Venue is merchant of record via its own Razorpay/UPI account (core payments); we never hold player money | Avoid payment-aggregator licensing and settlement risk |
| Double booking | Single source of truth calendar with slot holds and atomic confirmation; staff app for phone/walk-in entries | Core promise; must be bulletproof |
| Marketplace coexistence | MVP: manual block of marketplace bookings by staff; P2: calendar sync where APIs or partner consoles allow | Owners will not drop marketplaces on day one |
| Player app | No native app; booking page is a PWA from QR/link/WhatsApp | Speed to market; players already use WhatsApp |
| Cancellation policy | Venue-configurable (for example full refund 24h before, 50% within 24h, none within 4h) | Reduces no-shows; owner control |
| Minors | Captain declares age; under-18 players need guardian consent for CRM marketing | DPDP children's data rules |

## Core modules used

QR engine, public storefront (venue booking page), booking engine (slots, holds, packs), payments (advance, split, refunds), customer CRM, WhatsApp messaging, loyalty and rewards (packs, referral credit), reviews and Google review funnel, staff app, analytics, onboarding wizard. See [core/](https://github.com/craftLayer-studio/craftlayer-core/blob/main/README.md).

## Open questions

1. **Name check.** No major brand named "TurfTime" found in turf booking on 2026-11-24 searches. However, **Turf Town** (Turftown Sporting Pursuits Pvt Ltd, Chennai, founded 2018) is an active player booking app with a very similar name ([App Store](https://apps.apple.com/app/id1490231308), [Smarther](https://www.smarther.co/business-model/turf-town-the-complete-business-model/), accessed 2026-11-24). Risk: confusion and a possible trademark objection, especially in Chennai. Alternatives if we rename: **SlotKing** and **PlayDesk** (both need trademark and domain checks; estimate).
2. Should split pay confirm the slot only when the full advance is collected, or let the captain pay the remainder after a timeout? Validate with pilots.
3. Which marketplaces offer calendar sync or partner APIs? Playo has a partner console ([Playo help](https://playo-partner.freshdesk.com/support/solutions/articles/1070000137391-what-is-the-playo-partner-console-)); API access unknown.
4. Gaming cafes need per-station timers and food/beverage add-ons. Is that a separate SKU or Pro feature?
5. GST rate on turf bookings: a general HSN listing shows 18% for sports facility operation; no turf-specific ruling found. Confirm with a CA before building invoice templates.
6. Do we offer a white-label Android app for Pro (₹ extra) or stay PWA-only?

## Code

MVP web app: Next.js 16 (App Router, webpack), React 19, TypeScript strict, Astryx design system (Matcha theme), Postgres through Drizzle (PGlite for dev and tests).

### Structure

| Path | What lives there |
|---|---|
| `src/domain/` | Pure business rules, no React/Next/IO: money (paise), IST time, phone (E.164), pricing rules, slot grid, booking states and refunds, split pay, consent, CRM tags, fill offers, WhatsApp texts, reports. Unit tests sit next to each file. |
| `src/server/db/` | `schema.ts` (all tables, every business row has `org_id`), `client.ts` (PGlite file DB at `./.data/pglite`, in-memory in tests, `pg` when `DATABASE_URL` is set), `migrations/` (drizzle-kit SQL, committed), `seed.ts` (fictional demo venue). |
| `src/server/store/` | Data access and use cases in transactions: `bookings.ts` (holds, payments, split, staff desk, cancel), `venue.ts`, `players.ts` (CRM, consent), `messaging.ts` (outbox), `offers.ts`, `reports.ts`, `auth.ts` (OTP), `settings.ts`. Integration tests run against in-memory PGlite. |
| `src/server/adapters/` | Integration adapters. Only simulated ones exist: WhatsApp (writes to `outbox`) and payment gateway. No network calls. |
| `src/server/http.ts`, `session.ts`, `rate-limit.ts` | Input parsing, signed httpOnly session cookie, in-memory rate limiter for public endpoints. |
| `src/app/api/` | Thin route handlers: parse, validate, call the store, return JSON. |
| `src/app/` pages | `/` landing, `/demo`, `/b/[token]` public booking (QR), `/p/[token]` player booking and split-pay page, `/optout/[token]`, `/login`, `/staff` desk, `/owner/*` dashboard, players, offers, outbox, settings, QR sheet. |
| `src/components/` | Client components built from Astryx components. |

### Commands

```bash
pnpm install
pnpm dev                 # http://localhost:3000 (next dev --webpack); auto-seeds an empty DB
pnpm db:seed [--reset]   # seed the demo venue (reset wipes all data first)
pnpm db:generate         # new SQL migration after editing schema.ts
pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm exec astryx doctor --built .
```

### Rules

- No double booking is a database guarantee: `slot_claims` has a primary key on (resource, slot start) and every booking, hold and block inserts its claims in the same transaction. Never book a slot any other way. Cancelled and expired bookings delete their claims.
- Money is integer paise. Amounts to pay are always computed on the server (`startCheckout`); never accept an amount from the client.
- Times are UTC `timestamptz`; venue-local dates and minutes are IST via `src/domain/time.ts`.
- Players are keyed by E.164 phone per org. Consent is two separate opt-ins (service updates, marketing) stored as `consent_records`; messages are checked against consent when queued and again when sent. Marketing messages carry an opt-out link.
- Every query filters by `org_id`; staff/owner actions take the session's org, never one from the request. Owner-only actions are checked on the server.
- Public URLs use random 128-bit tokens (`newToken`), never row ids.
- UI: Astryx components and tokens only (see the Astryx block below). Client components that render a `Table` take plain data from server pages.
- Keep `next build --webpack` and `next dev --webpack`.
- Commits: conventional subjects. No `Co-Authored-By` trailers or "Generated with" lines.

<!-- ASTRYX:START -->
Astryx v0.7.17 · 174 components
CLI: run every command as `pnpm exec astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx component <Name>` to read props before using one; `astryx template <Block>` prints a block example to read for a part it lacks. Astryx names differ from other libraries: buttons, badges, tokens and tabs take their text in `label` (Text, Heading and Link take children), booleans start with `is` or `has` (`isOpen`, `isDisabled`), and every input takes `value` and `onChange`.
Changing an existing page? Keep it: skip step 2 and add components inside its sections; read a block example when it helps.
Before you deliver a build, run `astryx doctor --built <dir>`; don't deliver it if it fails.

RULES:
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then tokens (var(--color-*|--spacing-*|--radius-*)). No raw hex/px. No StyleX/Tailwind compiler here — don't use xstyle/utility classes directly. Some templates use StyleX and need a compiler plugin; see `astryx docs styling-overview`.
- THEMES: palettes and custom colors go through the theme, never :root overrides; so does a denser or roomier app (`editor set <name> spacing tight`), never gap and padding changes page by page. A change to one kind of part (the sidebar, its selected item, the gaps in a form) is a theme change too, not props on one page: `editor how "<ask>"` names the `set … --on <part>` line. No app yet: `astryx experimental theme preview app <dir>` makes a starter app that shows the theme. To make or change a theme (colors, fonts, corners, spacing, a look from a picture), prefer the experimental theme editor over hand-written theme files: `astryx experimental theme editor new <name> --like neutral`, then `editor set <name> <thing> <value>` or `editor how "<what you want>"`; wire it with `astryx theme add <name>`; after each change look at it with `astryx experimental theme editor show <name> --png` (takes pictures of real components) and open the PNGs it writes; a theme change is not done until you have looked at the pictures. In code, extend an imported theme to customize it; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any raw <div>/<span>, imported .css/@apply, or hardcoded #hex/px with the component or a token.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands and API reference
  docs authoring     build an integration package, and every field it holds
  upgrade --from <old version> --apply   run after a dependency bump
To remove this block, run `astryx init --remove-agents`, which removes it from the agent files at the project root and in the folder you run it in; from any other file it leaves, delete everything from ASTRYX:START to ASTRYX:END.
<!-- ASTRYX:END -->
