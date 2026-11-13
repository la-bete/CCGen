# Changelog

## 1.0.0

First major release. It fixes several correctness bugs, some of which change behaviour, and modernises the build.

### Breaking changes

- **Errors are `CCGenError` objects.** Brand and issuer errors used to be thrown as plain strings, and option errors as plain `Error`s with ad hoc messages. Every error is now a `CCGenError` (extends `Error`) with a stable `code`: `UNKNOWN_BRAND`, `BRAND_NOT_AVAILABLE`, `UNKNOWN_ISSUER`, `NO_MATCHING_BIN` or `INVALID_OPTION`. Messages have one format, e.g. `Unknown issuer "test"`, whether or not `brand` is also passed.
- **`amount` always returns an array.** `generateCC({ amount: 1 })` returns a one-element array; 0.x returned a single object. Omitting `amount` still returns a single card. `amount` must be a positive integer.
- **`validatePAN` accepts 12 to 19 digits.** 0.x returned `false` for anything under 16 digits, so valid 13-digit Visa and 15-digit Amex numbers were rejected. It now also returns `false` for numbers over 19 digits and for strings containing anything other than digits.
- **American Express cards are 15 digits with a 4-digit CVV.** 0.x generated 16-digit PANs for the Amex BIN 376862.
- **`brand` and `issuer` are included whenever known.** 0.x only returned `issuer` when you filtered by issuer, and dropped `brand` when filtering by issuer alone or using `startsWith`.
- **`startsWith` with a known prefix.** If it begins with a BIN from the table, the card gets that BIN's brand and issuer; otherwise the brand is inferred from the prefix. Amex prefixes (`34`, `37`) produce 15-digit PANs.
- **Issuer mapping corrected.** The `FCMB` and `STANDARD CHARTERED` BIN rows now map to `fcmb` and `scbn`. A BIN issued by Standard Chartered Bank Kenya no longer maps to `scbn`, so Mastercard + `scbn` now has no BINs.
- **Digit options must be digits.** Non-digit `startsWith` / `contains` / `endsWith` values were silently ignored; they now throw `INVALID_OPTION`. Numbers above `Number.MAX_SAFE_INTEGER` throw instead of losing precision.
- **Option length limits scale with PAN length.** After a BIN, `contains` + `endsWith` may be at most length − 8 digits (8 for 16-digit PANs, 7 for Amex); with your own `startsWith`, all three may be at most length − 6.
- **Node.js 20 or later** is required (`engines.node >= 20`).

### Fixes

- A second `new CCGen()` in the same process broke issuer filtering for most banks, because the constructor rewrote the shared BIN table in place. The table is no longer modified; indexes are built per instance.
- `brand` filtering always returned the same single BIN per brand, and `brand` + `issuer` only worked for Zenith. Brand filters now draw from every BIN of the brand, and every brand + issuer pair with BINs works.
- Random picks were skewed toward low values and never chose the last item, so the last BIN in a list and expiry month 12 never appeared. Picks are now uniform and inclusive. Random digits are now drawn uniformly as well.
- `brand` now also accepts `amex` / `american express` and `maestro`.
- PAN generation was rewritten: one free digit is solved so the PAN passes Luhn, and `contains` can no longer overlap `endsWith`.

### Package and tooling

- Builds with TypeScript 5 (strict, ES2020 target) and ships declaration files and source maps in `lib/`.
- `package.json` has an `exports` map, `sideEffects: false` and `engines`. The `build` script compiles; `prepublishOnly` runs build and tests, so an empty or failing package can't be published. The old `push:publish` script is removed.
- 0.1.x could not be built on a fresh install (TypeScript 4.9 could not parse the current `@types/node`); `@types/node` is now pinned to the Node 22 line.
- Tests run on Jest 30 with ts-jest; `npm test` works without workarounds.
- `package-lock.json` is committed.
- Travis CI is replaced by GitHub Actions (Node 20 and 22, with Codecov upload).
- New exports: `CCGenError`, `ISSUERS`, `CARD_ATTRIBUTES`, and the types `Card`, `CardAttribute`, `GenerateCCOptions`, `CCGenErrorCode`, `IssuerKey`, `Brand`.

## 0.1.2

Last 0.x release.
