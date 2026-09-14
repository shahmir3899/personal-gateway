# Captain's Trophy Room

An embeddable "ship captain's cabin" trophy display widget for a WordPress
referral program. Plain HTML/CSS/JS, no framework, scoped so it can drop into
an existing theme without collisions.

Working end-to-end against mock data: trophy rendering, click-to-zoom,
marathon switching/locked-teaser, and a responsive pass are all done. Real
Marathon 2 trophy art and the cabin background are in place (chroma-keyed
from client-supplied photos — see `assets/trophies/marathon-2/README.md` for
the placeholder tier mapping, since only 8 distinct designs exist for 10
tiers). Still to do: WordPress packaging. See [docs/schema.md](docs/schema.md)
for the data contract and the project plan (in conversation history) for the
full phase breakdown.

## Running the dev harness locally

Any static file server works (the widget fetches JSON, so `file://` won't
work — browsers block `fetch` on local files). For example:

```bash
npx serve .
```

Then open `http://localhost:3000/src/index.html`. Try the mock member links
at the top of the page (`?member_id=101/102/103`).

## Structure

- `src/` — widget source (`ctr.js` entry point, `ctr-model.js` pure logic,
  `ctr-view.js` rendering, `ctr-carousel.js` case navigation, `ctr.css`
  scoped styles, `index.html` dev harness)
- `data/` — mock JSON fixtures (marathon/trophy definitions, sample member
  progress), matching the eventual real API's response shape
- `assets/` — background photo, trophy PNGs (both populated with real,
  chroma-keyed art), small UI icons (not yet needed), and `reference/`
  (style-mockup photos, not loaded by the widget)
- `docs/schema.md` — the data contract between backend and widget
- `scripts/chroma_key.py` — the dev utility used to cut trophies out of
  their green-screen source photos; not part of the widget runtime
- `source-images/` — the raw, un-keyed photos as supplied, archived here
  (not referenced by any code)

## Design constraints (do not violate)

- No auth/login/account logic — a member is already authenticated by the
  host WordPress site; this widget only receives a `memberId`.
- No credentials or account data are stored by this widget's database —
  only trophy/referral/progress data, keyed by an opaque `external_member_id`.
- Referral counts are cumulative across marathons.
