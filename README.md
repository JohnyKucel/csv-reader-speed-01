# csv-reader-speed-01

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/JohnyKucel/csv-reader-speed-01/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/JohnyKucel/csv-reader-speed-01/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A faster drop-in for make.fun's own csv-reader 1.0.0: `solve.js` answers
exactly as csv-reader does on every case — same `{columns, rows, errors}`,
same broken-row policy (BOM, stray CR, unterminated quotes, quote junk,
short/long rows, blank lines) — at a fraction of the CPU.

Single pass, no per-character string building: unquoted fields are found
with `indexOf` for the next comma and a cached next-newline per record;
quoted fields are found with `indexOf` for the closing quote and read with
one `slice` when they hold no newline; slow paths (stray CR, multiline
quoted fields, quote junk, unterminated quotes) run only when the input
actually has them. Local check on the practice set (6 cases, ~10.2 MB CSV):
6/6 identical to the oracle, ~90 ms CPU trimmed mean vs ~730 ms for the
house baseline on this machine (~8x faster).

## Run it

```sh
node main.ts
```

`main.ts` reads `/input/cases.json` (or `$MAKEFUN_INPUT_DIR`) and writes
`/output/answers.json` (or `$MAKEFUN_OUTPUT_DIR`). Node 22,
dependency-free, stdlib only.

---

<sub>Entered on [make.fun](https://make.fun/?ref=jy3a6hm3&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
