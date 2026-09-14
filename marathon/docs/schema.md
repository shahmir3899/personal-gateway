# Captain's Trophy Room — data contract

This is the shape the widget expects, whether it comes from the mock JSON
files in `/data` (current) or a real backend API later (Phase 9). Keeping the
real API's response matching this shape means swapping `dataSource: 'mock'`
for `dataSource: 'api'` requires no widget code changes.

Referral counts are **cumulative across marathons** — Marathon 2's trophies
require a higher `requiredReferrals` total than Marathon 1's, not a per-marathon
reset count.

## `GET {apiBase}/marathons`

```json
{
  "marathons": [
    {
      "id": "m1",
      "name": "Marathon 1",
      "sequenceOrder": 1,
      "requiredReferrals": 42,
      "trophies": [
        {
          "id": "m1-5k",
          "name": "5K",
          "tierOrder": 2,
          "caseNumber": 1,
          "requiredReferrals": 5,
          "imageKey": "5k"
        }
      ]
    }
  ]
}
```

Static content — marathon/trophy definitions rarely change, safe to cache
aggressively on the client.

## `GET {apiBase}/members/{memberId}/progress`

```json
{
  "memberId": "103",
  "displayName": "M. Okafor",
  "totalVerifiedReferrals": 60,
  "unlocks": [
    { "trophyId": "m1-founding-runner", "unlockedAt": "2026-04-01T09:00:00Z" }
  ]
}
```

Per-member, dynamic — this is the data that actually changes as referrals
come in.

## Derived view-model (`CtrModel.computeProgress`)

Given the two payloads above, `src/ctr-model.js` produces:

```json
{
  "memberId": "103",
  "displayName": "M. Okafor",
  "totalVerifiedReferrals": 60,
  "firstUnlockAt": "2026-04-01T09:00:00Z",
  "currentMarathonId": "m2",
  "marathons": [
    {
      "id": "m1",
      "isAccessible": true,
      "isComplete": true,
      "trophies": [
        {
          "id": "m1-5k",
          "isUnlocked": true,
          "unlockedAt": "2026-04-04T09:00:00Z",
          "daysSinceFirstTrophy": 3,
          "splitDaysSincePrevious": 3
        }
      ]
    }
  ]
}
```

This is what the view layer (`ctr-view.js`, Phase 1+) renders — it never
touches the raw API payloads directly.

## Backend DB schema (reference — see project plan for full rationale)

```
marathons(id, name, sequence_order, required_referrals)
trophies(id, marathon_id, name, tier_order, case_number, required_referrals, image_key)
members(id, external_member_id, display_name)
referrals(id, member_id, verified_at, source_ref)
member_progress(member_id, total_verified_referrals, current_marathon_id)
trophy_unlocks(id, member_id, trophy_id, unlocked_at)
```

`external_member_id` is the only link to the host site's member system — no
credentials or account data are ever stored here.
