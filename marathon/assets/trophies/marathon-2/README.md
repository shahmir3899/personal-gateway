Marathon 2 trophy art, cut out from the photos you supplied (chroma-keyed
from their green-screen backgrounds — see `scripts/chroma_key.py`).

## Mapping (placeholder — see note below)

You gave us 8 distinct trophy designs but Marathon 2 needs 10 (one per
`imageKey` in `data/marathons.json`). Until real per-tier art exists, two
tiers reuse another tier's design so every slot has *something* rather than
falling back to the text placeholder:

| imageKey         | Trophy design used                          | Status    |
|------------------|----------------------------------------------|-----------|
| founding-runner  | Anchor + laurel wreath                        | unique    |
| 5k               | Wave/flame swirl                              | unique    |
| 10k              | Globe wrapped in a gold ribbon                | unique    |
| 15k              | Globe on a gold orbital/armillary stand       | unique    |
| 20k              | Eagle standing on a compass globe             | unique    |
| half-marathon    | Cup with anchor medallion + wave motif        | unique    |
| 25k              | Wave/flame swirl                              | **reused from 5k** |
| 30k              | Globe wrapped in a gold ribbon                | **reused from 10k** |
| 35k              | Cup with ship + crown + laurel wreath         | unique    |
| full-marathon    | Crystal spire with gold ship                  | unique    |

Reasoning for the reused pair: 5K/10K's designs are reused for 25K/30K
because those tiers are never visible in the same case at once (Case 1 vs
Case 2), so the repeat is far less noticeable than reusing within a case.
The two "cup" trophies (crown + laurel) and the crystal spire were kept for
the biggest milestones (Half Marathon, 35K, Full Marathon) since they read
as the most ceremonial designs of the set.

**Replace `25k.png` and `30k.png` first** once distinct art exists for
those tiers — everything else here can stay as final art if you're happy
with it, this mapping is only a placeholder for those two.

Original (un-keyed) source photos are archived in `../../source-images/`
at the project root, not published with the widget.
