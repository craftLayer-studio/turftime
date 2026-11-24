# 01 Product plan: TurfTime

## Vision

Every independent turf, court and gaming cafe in India runs its own zero-commission booking channel, fills its off-peak hours, and knows its top 100 players by name.

## Problem in one line

Turf owners juggle phone calls, WhatsApp messages and marketplace bookings in a notebook. This causes double bookings and no-shows, and marketplaces take a commission (widely estimated at 10–15% per booking, [Idea Usher](https://ideausher.com/blog/develop-sports-ground-booking-app-like-playo/), accessed 2026-11-24) while owning the player relationship. Off-peak slots (6 am–4 pm on weekdays) sit empty (estimate).

## ICP

| Segment | Resources | Why they buy | Priority |
|---|---|---|---|
| Box cricket / football turf | 1–3 pitches | Double bookings, no-shows, commission, empty afternoons | 1 |
| Pickleball / badminton / padel courts | 2–8 courts | Fast-growing, tech-savvy players, recurring groups | 2 |
| Multi-sport complex | 3–10 resources | Many resources, staff coordination, academies | 2 |
| Gaming cafe | 5–30 stations | Station timers, peak pricing, tournaments | 3 |
| Turf chains / franchisors | 3+ venues | Central view | 3 (upsell) |

## Personas

| Persona | Role | Goals | Pain |
|---|---|---|---|
| Sandeep, 38 | Turf owner (also runs a business) | Full slots, cash in hand, no fights | Phone rings at midnight; staff double-books; teams no-show |
| Imran, 24 | Turf manager/staff | Simple booking entry | Notebook and WhatsApp chaos, blamed for clashes |
| Karthik, 27 | Team captain | Book fast, collect money from friends | Chasing 10 friends for ₹150 each over UPI |
| Ananya, 32 | Pickleball regular | Same slot every week | Has to call every week to rebook |
| Rohan, 19 | Gamer at a gaming cafe | Book station, join tournament | Walks in to find all stations full |

## User journeys

### Online booking with advance (acquisition, revenue)

1. Player scans venue QR or taps link in Instagram bio or WhatsApp group.
2. Sees resource, date, live slots with prices (peak shown).
3. Picks slot; slot is held for 7 minutes.
4. Enters phone (OTP), name; ticks consent for booking messages and, separately, offers.
5. Pays advance via UPI; booking confirmed; WhatsApp confirmation with location pin and cancellation policy.
6. T-3 hours: WhatsApp reminder. After play: balance collected at venue (UPI QR or cash, logged in staff app). Next day: review request and "book same slot next week" button.

### Split payment (activation)

1. Captain books and chooses "Split among 10 players".
2. Gets a WhatsApp share link; each friend pays their share (UPI).
3. Slot confirms when the advance is covered; captain can top up the rest before the hold expires (configurable).
4. Every paying player enters the venue CRM with consent (more players per booking = bigger CRM).

### Phone/walk-in booking (no double booking)

1. Staff opens staff app, taps slot, enters phone and name, marks "cash at venue" or sends payment link.
2. Same calendar; the slot disappears online instantly.
3. Marketplace booking arrives on Playo/Hudle: staff blocks it in TurfTime in two taps (MVP) or via sync (P2).

### Empty-slot fill (revenue)

1. At 10 am daily, the system finds slots for today and tomorrow below a fill threshold.
2. Sends a fill offer (for example 25% off 2–4 pm) to opted-in players who played at similar times, within frequency caps.
3. Owner sees "₹ recovered from fill offers" on the dashboard.

## Features by phase

### MVP (weeks 1–8, sellable)

| ID | Feature | P | Metric moved | Core module |
|---|---|---|---|---|
| T1 | Venue setup wizard: resources, opening hours, slot length, price rules | P0 | Activation | Onboarding wizard |
| T2 | Public booking page via QR/link: live slot grid, OTP login | P0 | Acquisition | QR engine, storefront |
| T3 | Slot holds, atomic confirmation, single calendar | P0 | Retention (owner trust) | Booking engine |
| T4 | Online advance payment, balance logging, refunds per policy | P0 | Revenue | Payments |
| T5 | Staff app: phone/walk-in booking, block marketplace bookings, today view | P0 | Activation | Staff app |
| T6 | Price rules: peak, off-peak, weekend, holiday | P0 | Revenue | Booking engine |
| T7 | WhatsApp confirmation, reminder, cancellation messages | P0 | Retention, fewer no-shows | WhatsApp messaging |
| T8 | Player CRM with consent, visit counts, spend | P0 | Retention | CRM |
| T9 | Owner dashboard: occupancy by hour, revenue, advance vs balance, no-shows | P0 | Retention (owner) | Analytics |

### Phase 2 (months 3–5)

| ID | Feature | P | Metric moved |
|---|---|---|---|
| T10 | Split payment among players | P1 | Activation, conversion |
| T11 | Empty-slot fill offers (automated) | P1 | Revenue (occupancy) |
| T12 | Recurring weekly bookings and hour packs/memberships | P1 | Retention, cash upfront |
| T13 | Google review funnel after play | P1 | Acquisition |
| T14 | Referral credit: player invites new team, both get ₹100 off | P1 | Referral |
| T15 | Waitlist for full slots; auto-offer on cancellation | P1 | Revenue |

### Phase 3 (months 6–12)

| ID | Feature | P | Metric moved |
|---|---|---|---|
| T16 | Tournaments and leagues: team registration, entry fee, fixtures, results on WhatsApp | P2 | Revenue, acquisition |
| T17 | Gaming cafe mode: station timers, extend-time, F&B add-ons | P2 | ARPU, new segment |
| T18 | Coaching academy batches (kids cricket, pickleball clinics) with monthly fees | P2 | ARPU |
| T19 | Multi-venue dashboard, central pricing | P2 | ARPU |
| T20 | Marketplace calendar sync (where partner access allows) | P2 | Retention |
| T21 | Dynamic pricing suggestions from occupancy history | P2 | Revenue |
| T22 | Floodlight/IoT relay: lights on only for booked slots | P2 | Owner cost saving, ARPU |

## Data model (key entities)

| Entity | Key fields | Notes |
|---|---|---|
| Venue (tenant/branch) | id, name, address, geo, GSTIN, policies | Core tenancy |
| Resource | id, venue_id, type (pitch, court, station), sport, capacity | |
| PriceRule | resource_id, day_of_week, time range, date range, price, priority | Evaluated per slot |
| Slot | resource_id, start, end, status (open, held, booked, blocked) | Generated from hours |
| Booking | id, slot_ids, captain_id, source (online, staff, marketplace), amount, advance, balance, status | Atomic with holds |
| SplitShare | booking_id, player_id, amount, status | P1 |
| Player | id, phone, name, age band, guardian_id, consents, sports, visits | Core CRM key |
| Payment / Refund | booking_id, amount, mode, gateway_ref | Core payments |
| Pack | player_id, hours_total, hours_used, expiry | P1 |
| Offer | slot_ids, discount, audience rule, sends, redemptions | P1 |
| Tournament / Team / Fixture | entry fee, teams, schedule, results | P2 |
| Consent | subject_id, purpose, channel, timestamp, withdrawn_at | DPDP |

## Integrations

| Integration | Purpose | Phase |
|---|---|---|
| Razorpay (UPI, payment links, refunds, route/split where available) | Advance and split payments | MVP |
| WhatsApp Business Platform | Confirmations, reminders, fill offers | MVP |
| Google Maps / Business Profile | Location pin, reviews | MVP / P1 |
| Instagram bio link | Booking link distribution | MVP |
| Marketplace partner consoles (Playo, Hudle, KheloMore) | Calendar sync where possible | P2 |
| Smart relays for floodlights | Energy control | P2 |
| Cricket scoring apps (link-out) | Tournament experience | P2 |

## Success metrics

| Layer | Metric | Target (first 6 months, estimate) |
|---|---|---|
| Acquisition (ours) | Paying venues | 10 by day 45 after MVP; 70 by month 6 |
| Activation | % of venue's bookings made through TurfTime (online + staff app) | ≥70% by day 30 |
| Venue outcome | Double bookings | 0 after go-live |
| Venue outcome | No-show rate on advance-paid bookings | Below 3% (estimate; validate) |
| Venue outcome | Off-peak occupancy lift from fill offers | +10 points |
| Retention (ours) | Monthly logo churn | Below 3% |
| Revenue | Blended ARPU | ≥₹2,400 per month |
| Referral | New venues from owner referrals | ≥25% by month 6 |

## Build plan (6–8 weeks, 2 engineers + 1 founder)

| Week | Deliverable |
|---|---|
| 1 | Venue/resource setup, price rules, slot generation |
| 2 | Public booking page, OTP, slot holds, atomic booking |
| 3 | Razorpay advance payment, refunds, cancellation policy |
| 4 | Staff app: phone/walk-in booking, blocks, today view |
| 5 | WhatsApp templates and automations; player CRM with consent |
| 6 | Owner dashboard; QR kit generator; pilot at 3 venues |
| 7 | Load/race-condition testing on holds; fixes from pilot |
| 8 | Pricing page, paid conversion of pilots, start field sales |
