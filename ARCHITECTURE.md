# Chewbuu Architecture

This is the target architecture for the AWS Blocks migration. Better Auth remains the identity authority; AWS Blocks owns the authenticated product API and durable domain workflows.

```mermaid
flowchart LR
  web["TanStack Start on Vercel"]
  expo["Expo app"]
  auth["Better Auth\nTanStack route"]
  blocks["AWS Blocks API\nApi namespaces"]
  db["Neon PostgreSQL\nBlocks Database + Kysely"]
  kv["Blocks KVStore\nshort-lived cache/idempotency"]
  table["Blocks DistributedTable\nroom/story projections"]
  realtime["Blocks Realtime\nchat and presence"]
  chime["Amazon Chime SDK\nmeeting media"]
  storage["Blocks FileBucket\nmedia objects"]
  jobs["Blocks async jobs/workflows"]
  places["Google Places API"]
  notify["Notification provider"]
  vectors["External vector service\noptional matching signal"]

  web --> auth
  expo --> auth
  web --> blocks
  expo --> blocks
  blocks --> auth
  blocks --> db
  blocks --> kv
  blocks --> table
  blocks --> realtime
  blocks --> chime
  blocks --> storage
  blocks --> jobs
  blocks --> places
  blocks --> notify
  blocks -. optional .-> vectors

  jobs --> db
  jobs --> notify
  jobs --> vectors
```

## Product Lifecycle

```mermaid
stateDiagram-v2
  [*] --> Onboarding
  Onboarding --> Ready: profile, intro video, photo, safety contact
  Ready --> DateRequested: choose place and party
  DateRequested --> Matching: async candidate discovery
  Matching --> MatchSelected: circle/friend priority
  Matching --> MatchSelected: random fill
  MatchSelected --> Chatting: private or group room
  Chatting --> ActiveDate: scheduled start/check-in
  ActiveDate --> ReviewPending: finish date
  ReviewPending --> ReviewPending: save review for later
  ReviewPending --> Settled: required reviews complete/deadline
  Settled --> Ready
  Settled --> RecapPublished: optional recap
  RecapPublished --> ProfileRecap: permanent
  RecapPublished --> StoryActive: 24 hours
  StoryActive --> ProfileRecap: expires from story view
```

## Relationship and Media Rules

- Friends are accepted one-to-one relationships with a private chat.
- Circles are accepted premium memberships with an automatically-created group chat.
- A group date has up to four participants per side and stores each participant's source and status.
- Solo dates use private chat; any multi-person date uses a Chime meeting.
- Date media is durable and can be attached to a user's review.
- Reviews may remain incomplete, but any pending required review blocks new date creation.
- Recaps are permanent profile content; story visibility is controlled by `story_expires_at`.
- KVStore is for short-lived cache/idempotency only. PostgreSQL is authoritative for product state.
