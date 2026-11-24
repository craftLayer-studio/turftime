# AGENTS.md: TurfTime

Brief for AI agents working on TurfTime docs, specs or code. Read this first.

## Context

- **Product:** TurfTime, vertical SaaS for sports turfs, box cricket, football 5s/7s, badminton/pickleball/padel courts and gaming cafes.
- **Portfolio:** CraftLayer. Shared platform lives in [`core/`](../core/README.md). Reference core modules; do not re-specify them.
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

QR engine, public storefront (venue booking page), booking engine (slots, holds, packs), payments (advance, split, refunds), customer CRM, WhatsApp messaging, loyalty and rewards (packs, referral credit), reviews and Google review funnel, staff app, analytics, onboarding wizard. See [core/](../core/README.md).

## Open questions

1. **Name check.** No major brand named "TurfTime" found in turf booking on 2026-11-24 searches. However, **Turf Town** (Turftown Sporting Pursuits Pvt Ltd, Chennai, founded 2018) is an active player booking app with a very similar name ([App Store](https://apps.apple.com/app/id1490231308), [Smarther](https://www.smarther.co/business-model/turf-town-the-complete-business-model/), accessed 2026-11-24). Risk: confusion and a possible trademark objection, especially in Chennai. Alternatives if we rename: **SlotKing** and **PlayDesk** (both need trademark and domain checks; estimate).
2. Should split pay confirm the slot only when the full advance is collected, or let the captain pay the remainder after a timeout? Validate with pilots.
3. Which marketplaces offer calendar sync or partner APIs? Playo has a partner console ([Playo help](https://playo-partner.freshdesk.com/support/solutions/articles/1070000137391-what-is-the-playo-partner-console-)); API access unknown.
4. Gaming cafes need per-station timers and food/beverage add-ons. Is that a separate SKU or Pro feature?
5. GST rate on turf bookings: a general HSN listing shows 18% for sports facility operation; no turf-specific ruling found. Confirm with a CA before building invoice templates.
6. Do we offer a white-label Android app for Pro (₹ extra) or stay PWA-only?
