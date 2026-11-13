# CCGen

[![codecov](https://codecov.io/gh/la-bete/ccgen/branch/master/graph/badge.svg?token=6PGAIGKMET)](https://codecov.io/gh/la-bete/ccgen)
[![CI](https://github.com/la-bete/ccgen/actions/workflows/ci.yml/badge.svg)](https://github.com/la-bete/ccgen/actions/workflows/ci.yml)

CCGen generates Luhn-valid test card numbers (PANs) from a table of real Nigerian issuer BINs, so test data looks like cards a Nigerian payment flow would actually see. Cards can be filtered by brand, issuer, prefix, suffix or an embedded digit sequence, and come with a random cardholder name, CVV and future expiry date. It also exposes a Luhn validator.

The numbers are for testing only. They pass the Luhn check but are not linked to any account.

## Tech stack

- TypeScript
- Node.js
- Jest

## Installation

```
npm install @la-bete/ccgen
```

Requires Node.js 20 or later. The package is CommonJS with type definitions included; `import { CCGen } from "@la-bete/ccgen"` also works from ES modules and TypeScript.

## Basic usage

```javascript
const { CCGen } = require("@la-bete/ccgen");
const ccgen = new CCGen();

const card = ccgen.generateCC();
/*
    card => {
        name: "Ajax Andrej",
        cvv: "065",                       // 4 digits for American Express
        pan: "4071271234567892",          // Luhn-valid; 15 digits for Amex, 16 otherwise
        expiryDate: "09/31",              // MM/YY, 3 to 15 years ahead
        brand: "VISA",                    // left out if unknown
        issuer: "Zenith Bank PLC"         // left out if the BIN's bank is not one of the issuers below
    }
*/

const cards = ccgen.generateCC({ brand: "mastercard", issuer: "gtb", amount: 5 }); // array of 5

ccgen.validatePAN("4111111111111111"); // true
```

One instance can be reused for any number of calls, and separate instances behave identically.

## generateCC(options?)

`PAN` (primary account number) is the card number. `BIN` (bank identification number) is its first 6 digits, which identify the brand and issuer.

| Option       | Description                                                                                                       | Default        |
| ------------ | ----------------------------------------------------------------------------------------------------------------- | -------------- |
| `brand`      | `visa`, `mastercard`, `amex` (or `american express`) or `maestro`, case-insensitive. The PAN starts with a BIN of that brand. | none           |
| `issuer`     | One of the issuer keys listed below. The PAN starts with a BIN from that bank.                                    | none           |
| `startsWith` | Your own leading digits. Ignored when `brand` or `issuer` is set, because a BIN from the table is used instead.   | a random BIN   |
| `contains`   | Digits placed straight after the BIN or `startsWith` digits.                                                      | none           |
| `endsWith`   | Digits the PAN should end with.                                                                                   | none           |
| `amount`     | Number of cards. When given, the result is always an array (even for `1`). When omitted, a single card is returned. | omitted        |
| `attributes` | Fields to include: one of `name`, `cvv`, `pan`, `expiryDate`, `brand`, `issuer`, or an array of them.               | all six        |

Digit options (`startsWith`, `contains`, `endsWith`) accept strings or numbers. Pass long values as strings: numbers above `Number.MAX_SAFE_INTEGER` throw.

### PAN length and card details

- American Express PANs are 15 digits with a 4-digit CVV. Visa, Mastercard and Maestro PANs are 16 digits with a 3-digit CVV.
- `brand` and `issuer` in the result come from the BIN that was used. With your own `startsWith`, the table is used if the prefix begins with a known BIN; otherwise the brand is inferred from the prefix (`4` Visa, `51`–`55` and `2221`–`2720` Mastercard, `34`/`37` American Express) and `issuer` is left out.

### Limits on digit options

- After a 6-digit BIN, `contains` and `endsWith` together may be at most length − 8 digits (8 for a 16-digit PAN, 7 for Amex).
- With your own `startsWith`, all three together may be at most length − 6 digits (10 for a 16-digit PAN).

### Errors

Every error is a `CCGenError` (a subclass of `Error`) with a stable `code`:

| `code`                | When                                                                    | Example message                                               |
| --------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------- |
| `UNKNOWN_BRAND`       | `brand` is not one of the supported brands                              | `Unknown brand "discover"`                                    |
| `BRAND_NOT_AVAILABLE` | `brand` is `verve`, which has no BINs in the table yet                  | `Brand "verve" is not available yet: there are no BINs for it` |
| `UNKNOWN_ISSUER`      | `issuer` is not one of the keys below                                   | `Unknown issuer "test"`                                       |
| `NO_MATCHING_BIN`     | the table has no BIN for that brand and issuer combination              | `No BINs for brand "visa" and issuer "ecobank"`               |
| `INVALID_OPTION`      | bad `amount`, non-digit or too-long digit options, unsafe numbers       |                                                               |

```javascript
const { CCGen, CCGenError } = require("@la-bete/ccgen");

try {
    new CCGen().generateCC({ brand: "visa", issuer: "stanbic" });
} catch (error) {
    if (error instanceof CCGenError && error.code === "NO_MATCHING_BIN") {
        // pick another combination
    }
}
```

Brand and issuer combinations with no BINs in the table: Visa with `ecobank` or `stanbic`; Mastercard with `fcmb`, `wema`, `union`, `access` or `scbn`. The single American Express and Maestro BINs are not from any of the listed issuers, so those brands work only without `issuer`.

### Available issuers

For `options.issuer`, pass one of the keys below:

```json
{
    "fcmb": "First City Monument Bank",
    "wema": "Wema Bank PLC",
    "union": "Union Bank of Nigeria",
    "access": "Access Bank PLC",
    "zenith": "Zenith Bank PLC",
    "gtb": "Guaranty Trust Bank PLC",
    "ecobank": "Ecobank Nigeria PLC",
    "stanbic": "Stanbic IBTC Bank",
    "uba": "United Bank for Africa PLC",
    "intercontinental": "Intercontinental Bank PLC",
    "polaris": "Polaris Bank PLC",
    "fbn": "First Bank of Nigeria PLC",
    "scbn": "Standard Chartered Bank"
}
```

## validatePAN(pan) / validatePAN(...pans)

Returns true when a PAN is 12 to 19 digits and passes the Luhn check. That covers 13-digit Visa, 15-digit American Express and 16- to 19-digit numbers.

- One argument returns a boolean.
- Several arguments return an object keyed by PAN, with a boolean for each.
- Strings must be digits only (no spaces). Numbers above `Number.MAX_SAFE_INTEGER` throw a `CCGenError`; pass long PANs as strings.

```javascript
ccgen.validatePAN("378282246310005"); // true (15-digit Amex)
ccgen.validatePAN("4111111111111111", "4111111111111112");
// { "4111111111111111": true, "4111111111111112": false }
```

The check is format and Luhn only. It does not check that the prefix belongs to a real brand.

## Upgrading from 0.x

1.0.0 contains breaking changes. See [CHANGELOG.md](CHANGELOG.md) for the full list. In short:

- Errors are now `CCGenError` objects with a `code`, not plain strings. Code that compared thrown strings, or matched the old messages, needs updating to check `error.code`.
- `generateCC({ amount })` always returns an array when `amount` is given, including `amount: 1`. Without `amount` it returns a single card, as before.
- `validatePAN` accepts 12- to 19-digit PANs. 0.x rejected anything under 16 digits.
- American Express cards are 15 digits with a 4-digit CVV (0.x produced 16-digit Amex PANs).
- `brand` and `issuer` appear in results whenever they are known, not only when you filtered on them.
- `brand` also accepts `amex` / `american express` and `maestro`.
- Node.js 20 or later is required.

## Known limitations

- Verve is not supported: the table has no BINs labelled Verve. The one BIN labelled Maestro, 506122, falls in a range commonly assigned to Verve, so it may be mislabelled in the source data.
- The BIN table is a static snapshot, and some banks in it have since merged or been renamed (Skye Bank BINs are mapped to Polaris Bank). BINs from banks that are not in the issuer list, such as Oceanic, Diamond or Citibank Nigeria, are still used when no filter is given, but the card has no `issuer` field and they can't be selected by `issuer`.
- Cardholder names, CVVs and expiry dates are random and use `Math.random()`. They are test data, not secure values.

## Next steps

- Add Verve BINs so `brand: "verve"` works.
- Refresh the BIN table from a current source.

## License

MIT
