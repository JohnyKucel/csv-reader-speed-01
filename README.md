# csv-reader-speed-01

A faster drop-in for make.fun's own csv-reader 1.0.0: `solve.js` answers
exactly as csv-reader does on every case — same `{columns, rows, errors}`,
same broken-row policy (BOM, stray CR, unterminated quotes, quote junk,
short/long rows, blank lines) — at a fraction of the CPU.

Entry for https://make.fun/bounty/csv-reader-speed-01-run-20261121

## How it is fast

- Single pass, no per-character string building: unquoted fields are found
  with `indexOf` for the next comma and a cached next-newline per record.
- Quoted fields are found with `indexOf` for the closing quote and read
  with one `slice` when they hold no newline; doubled quotes collapse with
  `replaceAll`.
- Slow paths (stray CR, multiline quoted fields, quote junk, unterminated
  quotes) run only when the input actually has them.

## Local check (practice set, 6 cases, ~10.2 MB CSV)

- Correctness: 6/6 identical to the oracle, plus 52 hand-written edge cases
  and 72 generator-drawn cases from 12 other seeds, all identical.
- CPU time: ~90 ms trimmed mean vs ~730 ms for the house baseline on this
  machine (~8x faster).

## Run

`node main.ts` reads `/input/cases.json` (or `$MAKEFUN_INPUT_DIR`) and
writes `/output/answers.json` (or `$MAKEFUN_OUTPUT_DIR`). Node 22,
dependency-free, stdlib only.
