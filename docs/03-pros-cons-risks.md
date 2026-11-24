# 03 Pros, cons, risks: TurfTime

## Pros

| Pro | Why it matters |
|---|---|
| Fast-growing supply | Box cricket bookings on Playo's network rose from 4.62 lakh (Jan–Aug 2024) to 8.66 lakh (Jan–Aug 2026) ([ThePrint](https://theprint.in/ground-reports/gurugram-box-cricket-business-farmland/3080271/), accessed 2026-11-24) |
| New sports adding venues | Pickleball courts reported above 1,200 by 2025–26; padel about 300 courts by early 2026 ([India Sports Hub](https://indiasportshub.com/?p=51569), [Free Press Journal](https://www.freepressjournal.in/sports/padel-surges-across-urban-india-with-300-courts-corporate-backing-and-ms-dhoni-investment-says-padelpark-india-co-founder-nikhil-sachdev)) |
| Obvious ROI | Commission saved and no-shows prevented are visible in week one |
| Simple core product | Slot booking + payments + WhatsApp, mostly from core |
| Owners are reachable | Venues are physical, clustered, and open late; easy to visit |
| Network effect inside each venue | Split pay brings 6–14 players per booking into the venue's CRM |

## Cons

| Con | Impact |
|---|---|
| Marketplaces are entrenched | Playo claims 5,000+ venues in 100+ cities ([PR Newswire](https://www.prnewswire.com/in/news-releases/playo-joins-forces-with-amazon-a-game-changing-partnership-for-sports-enthusiasts-302580074.html)); Hudle advertises 0% commission venue software ([Hudle](https://hudle.in/list-your-sports-venue)) |
| We bring no player demand | Owners still need marketplaces for discovery of new players |
| Seasonality | Monsoon and exam seasons cut outdoor turf demand (estimate) |
| Small venues are price-sensitive | Some will only accept pay-per-booking |
| Venue churn | Some turfs on leased land close or change hands (ThePrint reports turfs on land leased from villagers) |

## Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Double booking bug destroys trust | Medium | Very high | Atomic holds with DB constraints; load test; staff-app offline queue with conflict alert; SLA: we refund the venue's loss in month 1 |
| Hudle offers free/0% venue software | High | High | Win on WhatsApp-native flows, split pay, fill offers, owner-owned CRM and on-ground support; publish a comparison |
| Marketplaces penalise venues that push direct booking | Medium | Medium | Position as complement; repeat players only; owner decides |
| Players will not pay advance | Medium | High | Allow small advance (₹200–₹500); offer "pay at venue" for trusted repeat players |
| WhatsApp marketing costs and opt-out rates | Medium | Medium | Fill offers only to opted-in players; frequency caps; credits model |
| Payment disputes and refunds | Medium | Medium | Clear cancellation policy at checkout; refunds via gateway; venue is merchant of record |
| DPDP compliance (main obligations about May 2027) | Medium | High | Consent at OTP, separate marketing opt-in, guardian flow for under-18, deletion on request |
| Founder spreads across turfs, courts and gaming cafes too early | High | Medium | MVP for box cricket and football turfs only; courts in month 3; gaming cafes in phase 3 |

## Kill criteria

| Checkpoint | Kill / pivot trigger |
|---|---|
| Week 8 (pilot end) | Fewer than 2 of 3 pilot venues route ≥50% of bookings through TurfTime |
| Day 45 after MVP | Fewer than 10 paying venues after 80+ owner conversations |
| Month 4 | Activation below 50% (share of venue bookings through TurfTime) across paying venues |
| Month 6 | Monthly logo churn above 6%, or blended ARPU below ₹1,500 |
| Month 6 | More than 50% of lost deals cite "Hudle/Playo gives this free" with no counter that works |
| Month 9 | MRR below ₹1.5 lakh |

Pivot options: become the tournament/league engine only (sold per event); or bundle TurfTime as a module inside a broader "sports academy" product with ClassNest.
