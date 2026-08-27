# Venue operations analytics

Chewbuu records venue timing as an immutable PostgreSQL event ledger. The ledger is the source of truth; the venue dashboard derives deterministic metrics from it rather than relying on browser timers or an external analytics store.

## Operational events

| Event | Meaning | Typical source |
| --- | --- | --- |
| `arrived` | Guest/dating session began at the venue | Guest check-in |
| `cooking_started` | Kitchen accepted/prepared an order | Staff order stage |
| `food_served` | Food was brought out | Staff order stage |
| `date_ended` | Dining/date session ended | Staff session close |
| `reservation_requested` | Guest requested a reservation | Guest booking |
| `reservation_confirmed` | Venue confirmed the reservation | Staff stage |
| `reservation_seated` | Party was seated | Staff stage |
| `order_submitted` | Guest submitted an order | Guest order |
| `order_completed` | Order was completed | Staff order stage |

Each event stores the location, optional organization, session/order/reservation/date references, actor, source, timestamp, and non-PII metadata. Events are append-only so corrections are represented by a later event instead of rewriting history.

## Dashboard metrics

The Sync workspace supports a configurable date range and currently derives:

- average arrival-to-food-served wait
- average cooking-start-to-food-served kitchen time
- average arrival-to-date-ended duration
- average completed order cost
- completed orders, reservations, covers, tips, and event count

Missing endpoints are reported as `Not enough data`; they are never treated as zero.

## Public metrics

Public analytics are opt-in per location and require a configurable minimum sample size (at least five paid, completed orders by default). Public surfaces expose only aggregate average wait and average completed-order cost plus active published specials. Raw events, staff identity, guest identity, and small cohorts remain private.

## Product analytics events

Marketing/product analytics should use object-action names and avoid PII:

| Event | Properties | Decision |
| --- | --- | --- |
| `venue_special_viewed` | `location_id`, `category` | Which offers attract date planners? |
| `venue_special_filter_changed` | `category` | Which filters deserve prominence? |
| `venue_public_metrics_viewed` | `location_id`, `metric_set` | Do public metrics build trust? |
| `venue_timeline_event_recorded` | `event_type`, `source` | Are staff recording the checkpoints? |
| `venue_analytics_range_changed` | `range_days` | What reporting windows are useful? |
| `venue_workspace_section_viewed` | `section` | Which Sync surfaces need iteration? |

Do not send names, emails, free-form notes, order item names, exact addresses, or raw feedback text to product analytics.

## Embeddings

Embeddings are not used for timing, cost, wait, or throughput calculations. Those metrics require exact relational timestamps and auditable joins. A future qualitative-feedback feature may embed redacted review text in a separately governed Postgres/vector index for semantic themes, with retention, deletion, consent, and access controls defined before enabling it. Upstash is intentionally not part of this architecture.
