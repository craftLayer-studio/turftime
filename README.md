# TurfTime

**Tagline:** Your own booking app, zero commission. Fill every slot, get paid upfront.

TurfTime is vertical SaaS for sports turfs, box cricket arenas, football 5s/7s, badminton and pickleball courts, padel courts, and gaming cafes in India. A QR code at the venue and a shareable booking link let players book slots and pay an advance online. The calendar blocks double bookings across walk-ins, phone calls and online bookings. Owners get peak/off-peak pricing, split payment among players, tournaments, a repeat-player CRM, WhatsApp reminders, and automatic offers to fill empty slots.

## Ideal customer (ICP)

| Attribute | Primary ICP | Secondary ICP |
|---|---|---|
| Business | Independent box cricket / football turf with 1–3 pitches | Badminton, pickleball, padel courts; gaming cafes (PC/console stations) |
| Bookings today | Phone calls and WhatsApp, plus a marketplace (Playo, Hudle, KheloMore) | Walk-ins and WhatsApp groups |
| Slot price | ₹600–₹2,000 per hour (estimate) | ₹200–₹1,500 per hour or per station (estimate) |
| Location | Tier 1–3 cities in India | Same |
| Buyer | Owner (often runs another business; turf managed by 1–2 staff) | Owner or manager |

## Top features (P0 = in the 6–8 week MVP)

| Priority | Feature | Metric it moves |
|---|---|---|
| P0 | Venue booking page via QR and link; live slot grid | Acquisition, revenue |
| P0 | Online advance payment (UPI/Razorpay), balance at venue | Revenue (fewer no-shows) |
| P0 | Single calendar: no double booking across online, phone, walk-in | Retention (of owner), revenue |
| P0 | Peak/off-peak and weekend pricing | Revenue (ARPU per slot) |
| P0 | WhatsApp booking confirmation and reminders | Retention, fewer no-shows |
| P0 | Player CRM with consent, repeat-player tagging | Retention |
| P1 | Split payment among players | Activation, revenue |
| P1 | Empty-slot fill offers to past players | Revenue (occupancy) |
| P1 | Recurring bookings and slot packs/memberships | Retention, revenue |
| P1 | Google review funnel | Acquisition |
| P2 | Tournaments and leagues: registration, fixtures, payments | Revenue, acquisition |
| P2 | Gaming cafe station timers, coaching batches, multi-venue | ARPU |

## Pricing (summary)

| Plan | INR / month | USD / month | Commission |
|---|---|---|---|
| Pay-per-booking | ₹0 + ₹19 per online booking | $0 + $0.22 | Flat fee, no percentage |
| Starter (1 venue, up to 2 courts) | ₹1,499 | $17 | 0% |
| Growth (up to 6 courts) | ₹2,999 | $34 | 0% |
| Pro (multi-venue, up to 15 courts) | ₹5,499 | $62 | 0% |

Annual billing: 2 months free. Prices exclude 18% GST. USD at ₹88 = $1 (estimate). Payment gateway fees are paid by the venue to the gateway. Detail: [docs/05-pricing-and-revenue.md](docs/05-pricing-and-revenue.md).

## Why TurfTime wins

- **Own your players.** Marketplaces take a commission, widely estimated at 10–15% per booking, and own the player relationship. TurfTime is a flat fee and the CRM belongs to the venue. See [docs/04-market-research.md](docs/04-market-research.md).
- **Built for Indian group payments.** Split UPI payment among 6–14 players is a real pain no marketplace solves well.
- **Works with marketplaces, not against them.** Keep Playo/Hudle for discovery; move repeat players to your own link.

## Status

**MVP, demo data, simulated messaging and payments.** Live site (planned): https://turftime.craftlayer.store. Support: turftime@craftlayer.store.

## How to run

Needs Node 20.9+ and pnpm 11.

```bash
pnpm install
pnpm dev                      # http://localhost:3000, creates and seeds ./.data/pglite on first request
# or a production build on port 3131:
pnpm build && APP_URL=http://localhost:3131 pnpm start -p 3131
```

Copy `.env.example` to `.env.local` to set `APP_URL` (QR codes and share links), `SESSION_SECRET` and optionally `DATABASE_URL` (real Postgres instead of PGlite). `pnpm db:seed --reset` restores the demo data.

Checks: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, plus `pnpm exec astryx doctor --built .`.

## Demo walkthrough

The demo venue is fictional: **TurfTime Demo Arena**, Pune, with four courts (box cricket, football 5s, badminton, pickleball) and four weeks of sample bookings. Every page that shows it is labelled Demo.

1. Open `/demo`. It links to the venue's public booking page `/b/<token>` (the URL its QR code opens).
2. As a player: pick a date, court and slot (peak, off-peak and weekend prices show on each slot), enter name and mobile, tick the optional WhatsApp consents, optionally split among players, then **Hold slot**. The slot is held for 7 minutes (30 for split pay).
3. On `/p/<token>` pay the advance through the simulated gateway or the UPI intent link. With split pay, each friend opens the same link and pays their share; the slot confirms when the advance is covered. Cancelling refunds by policy.
4. Sign in at `/login` as staff (+91 90000 00002) or owner (+91 90000 00001). The OTP is shown on screen as a demo.
5. Staff desk `/staff`: one calendar for online, phone, walk-in and marketplace bookings. Tap an open slot to book a walk-in or block a marketplace booking; tap a booking to collect the balance, mark played or no-show, or cancel.
6. Owner: `/owner` dashboard (utilisation heatmap, revenue, advance vs balance, no-shows, fill-offer revenue), `/owner/players` (repeat-player CRM with consent), `/owner/offers` (send empty-slot offers to opted-in players), `/owner/messages` (WhatsApp outbox, simulated), `/owner/settings` (advance, hold time, UPI ID, courts, price rules, demo reset), `/owner/qr` (printable QR sheet).

## Built vs planned

| Feature | Status |
|---|---|
| T1 Venue setup: courts, hours, price rules (settings page; no guided wizard yet) | Built |
| T2 Public booking page via QR/link, live slot grid | Built (no player OTP: phone is captured with consent) |
| T3 Slot holds, atomic confirmation, single calendar, DB-level no double booking (tested with 20 concurrent holds) | Built |
| T4 Advance payment (simulated gateway + UPI intent), balance logging, refunds by policy | Built (simulated) |
| T5 Staff desk: walk-in/phone booking, marketplace blocks, day view | Built |
| T6 Peak, off-peak, weekend, holiday pricing | Built |
| T7 WhatsApp confirmation, reminder, cancellation | Built (simulated outbox + wa.me links) |
| T8 Player CRM with consent, visits, spend, tags | Built |
| T9 Owner dashboard: utilisation heatmap, revenue, advance vs balance, no-shows | Built |
| T10 Split payment among players | Built |
| T11 Empty-slot fill offers | Built (owner sends; no automatic 10 am job yet) |
| T12 to T22 (recurring bookings, packs, reviews, referrals, waitlist, tournaments, gaming cafe mode, multi-venue, marketplace sync) | Planned |
| Real Razorpay, WhatsApp Business API, SMS OTP | Planned (adapters are in place) |

## Documents

- [AGENTS.md](AGENTS.md): brief for AI agents
- [01 Product plan](docs/01-product-plan.md)
- [02 Problems and benefits](docs/02-problems-and-benefits.md)
- [03 Pros, cons, risks](docs/03-pros-cons-risks.md)
- [04 Market research](docs/04-market-research.md)
- [05 Pricing and revenue](docs/05-pricing-and-revenue.md)
- [06 Go-to-market and onboarding](docs/06-go-to-market-and-onboarding.md)
- Shared platform: [core/](https://github.com/craftLayer-studio/craftlayer-core/blob/main/README.md)

## Licence

Source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). Personal, educational, research and non-profit use is free. **Any commercial use requires a paid licence or written permission from CraftLayer Studio.** See [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md).

Part of the [CraftLayer Products](https://github.com/craftLayer-studio/craftlayer-products) portfolio.
