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

## Documents

- [AGENTS.md](AGENTS.md): brief for AI agents
- [01 Product plan](docs/01-product-plan.md)
- [02 Problems and benefits](docs/02-problems-and-benefits.md)
- [03 Pros, cons, risks](docs/03-pros-cons-risks.md)
- [04 Market research](docs/04-market-research.md)
- [05 Pricing and revenue](docs/05-pricing-and-revenue.md)
- [06 Go-to-market and onboarding](docs/06-go-to-market-and-onboarding.md)
- Shared platform: [core/](../core/README.md)
