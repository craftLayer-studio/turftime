# 05 Pricing and revenue: TurfTime

Exchange rate used: ₹88 = $1 (estimate). Prices exclude 18% GST on our software fee (estimate of standard SaaS GST treatment; confirm with CA). Payment gateway fees (Razorpay standard 2% + GST, [Razorpay](https://razorpay.com/blog/razorpay-payment-gateway-pricing-explained/), accessed 2026-11-24) are paid by the venue to the gateway; venues may pass a convenience fee to players.

## Price anchors

| Anchor | Cost to a venue | Source (accessed 2026-11-24) |
|---|---|---|
| Marketplace commission | Third-party estimate 10–15% per booking; on a ₹1,200 slot that is ₹120–₹180 per booking (estimate) | [Idea Usher](https://ideausher.com/blog/develop-sports-ground-booking-app-like-playo/) |
| Hudle venue software | Advertised 0% commission; fees not published | [Hudle](https://hudle.in/list-your-sports-venue) |
| Global court software | CourtReserve $199–$549 per month (₹17,500–₹48,300) | [CourtReserve](https://courtreserve.com/pricing) |
| Global turf tools | TurfHop $39–$119; Okra Book $99; Sports Carnival $99–$299 per month | [Capterra India](https://www.capterra.in/software/176382/turfhop) |

TurfTime sits **below** global tools and **below** the commission a busy venue pays a marketplace, while offering more than a free calendar.

## Tiers

| | Pay-per-booking | Starter | Growth (recommended) | Pro |
|---|---|---|---|---|
| INR per month | ₹0 | ₹1,499 | ₹2,999 | ₹5,499 |
| Per online booking fee | ₹19 | ₹0 | ₹0 | ₹0 |
| INR per year (2 months free) | n/a | ₹14,990 | ₹29,990 | ₹54,990 |
| USD per month | $0 + $0.22 per booking | $17 | $34 | $62 |
| Venues / resources | 1 venue, 2 resources | 1 venue, 2 resources | 1 venue, 6 resources | 3 venues, 15 resources |
| QR + link booking page, advance payment | Yes | Yes | Yes | Yes |
| No-double-booking calendar, staff app | Yes | Yes | Yes | Yes |
| Price rules (peak/off-peak/weekend) | Basic | Yes | Yes | Yes + suggestions (P2) |
| WhatsApp confirmations and reminders (utility) | Yes | 1,500/month | 4,000/month | 10,000/month |
| Player CRM | View only | Yes | Yes | Yes |
| Split payment | No | No | Yes | Yes |
| Empty-slot fill offers | No | No | Yes (with credits) | Yes (with credits) |
| Recurring bookings, packs, memberships | No | Yes | Yes | Yes |
| Google review funnel, referrals | No | No | Yes | Yes |
| Tournaments and leagues (P2) | No | No | 1 per month | Unlimited |
| Gaming cafe station mode, academies (P2) | No | No | No | Yes |
| Staff logins | 1 | 3 | 8 | 20 |

**Why ₹2,999 is the hero price:** it equals the commission on about 17–25 marketplace bookings at ₹1,200 (estimate). A busy turf moves more repeat players than that in a week.

**Why pay-per-booking exists:** some owners refuse fixed fees. ₹19 per online booking is far below a 10–15% commission and converts to Growth automatically when monthly fees would exceed ₹2,999 (about 158 online bookings).

## Add-ons

| Add-on | Price | Margin logic |
|---|---|---|
| WhatsApp marketing credits (fill offers, tournament promos) | ₹1.10 per message (packs of 1,000) | Meta India marketing about ₹0.86 per message plus GST ([Monty Mobile](https://montymobile.com/blogs/whatsapp-business-api-pricing-in-india-inr-rates-gst-and-the-2026-currency-migration-deadline)) |
| Extra utility messages | ₹200 per 1,000 | Meta utility about ₹0.115 per message |
| QR kit (2 weatherproof standees, 4 stickers, banner) | ₹999 | Print cost about ₹400 (estimate) |
| Done-for-you setup | ₹1,999 one-time (waived on annual) | 2 hours of onboarding time (estimate) |
| Tournament pack (single event, any plan) | ₹999 per tournament | Fixtures, registration, payments, WhatsApp results |
| Floodlight relay integration (P2) | ₹6,999 setup + ₹299 per month | Hardware partner margin (estimate) |
| Custom domain and branded PWA | ₹499 per month | Pure software margin |

## Revenue streams

1. Subscriptions (target 75%).
2. Pay-per-booking fees (target 10%).
3. WhatsApp marketing credits (target 8%).
4. Tournament packs, kits, setup (target 7%).
5. Later: sponsorship marketplace connecting sports brands to venue tournaments (P2, estimate).

## Unit economics (estimate)

| Item | Value | Reasoning |
|---|---|---|
| Blended ARPU | ₹2,500 per month | Mix: 15% pay-per-booking (about ₹1,500), 30% Starter, 45% Growth, 10% Pro, plus ₹200 average add-ons |
| COGS per venue | ₹350 per month | Hosting ₹100, about 2,000 utility messages × ₹0.115 = ₹230, OTP/SMS ₹20 |
| Support cost per venue | ₹150 per month | 1 support person per about 200 venues |
| Gross margin | About 80% | (2,500 − 350 − 150) / 2,500 |
| CAC | ₹4,000 | Turfs cluster in localities; evening visits; a rep closes about 10 per month at ₹40,000 total cost |
| Payback | About 2 months | 4,000 / (2,500 × 0.8) |
| Monthly logo churn target | 3% | Average lifetime about 33 months |
| LTV | About ₹66,000 | 2,500 × 0.8 × 33 |
| LTV:CAC | About 16:1 | Drops to about 8:1 at 6% churn |

## 12-month scenarios (estimate)

Assumes MVP live at month 2, paid conversions from month 3, 3% monthly churn.

| Scenario | New venues per month (months 3–12) | Venues at month 12 | MRR at month 12 | ARR run-rate |
|---|---|---|---|---|
| Conservative | 7 | about 63 | about ₹1.6 lakh | about ₹19 lakh |
| Base | 15 | about 130 | about ₹3.25 lakh | about ₹39 lakh |
| Aggressive (2 reps + referrals + 2 cities) | 30 | about 260 | about ₹6.5 lakh | about ₹78 lakh |

Seasonality: expect a dip in new sales and in pay-per-booking revenue during monsoon (June–September) for outdoor turfs (estimate). Push annual plans in February–May.

## Discount rules

- Annual prepay: 2 months free.
- Founding 20 venues: Growth at ₹1,999 per month locked 12 months in exchange for a testimonial and 2 referrals.
- No percentage-of-booking pricing, ever. Flat fees are the core message.
