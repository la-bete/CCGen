# CCGen

[![codecov](https://codecov.io/gh/La-BeTe/CCGen/branch/master/graph/badge.svg?token=6PGAIGKMET)](https://codecov.io/gh/La-BeTe/CCGen)

CCGen generates Luhn-valid test card numbers (PANs) from a table of real Nigerian issuer BINs, so test data looks like cards a Nigerian payment flow would actually see. Cards can be filtered by brand, issuer, prefix, suffix or an embedded digit sequence, and come with a random cardholder name, CVV and future expiry date. It also exposes a Luhn validator.

The numbers are for testing only. They pass the Luhn check but are not linked to any account.

## Tech stack

- TypeScript
- Node.js
- Jest
- Babel

## Installation

```
npm install @la-bete/ccgen
```

## Basic usage

```javascript
const { CCGen } = require("@la-bete/ccgen");
const ccgen = new CCGen();

const card = ccgen.generateCC();
/*
    card => {
        name: string,
        cvv: string,         // 3 digits
        pan: string,         // 16 digits, Luhn-valid
        expiryDate: string,  // "MM/YY"
        brand: string,       // e.g. "VISA"; only present when known (see below)
        issuer: string       // e.g. "Guaranty Trust Bank PLC"; only present when options.issuer is passed
    }
*/

const isValid = ccgen.validatePAN("4111111111111111");
// isValid => true
```

## generateCC(options?)

`PAN` (primary account number) is the 16-digit card number generated. `BIN` (bank identification number) is its first 6 digits, which identify the brand and issuer.

| Option       | Description                                                                                                                         | Default          |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `brand`      | `visa` or `mastercard` (case-insensitive). The PAN starts with a BIN of that brand.                                                 | none             |
| `issuer`     | One of the issuer keys listed below. The PAN starts with a BIN from that bank.                                                      | none             |
| `startsWith` | Digits the PAN should start with. Ignored when `brand` or `issuer` is set, because the BIN is used instead.                         | a random BIN     |
| `endsWith`   | Digits the PAN should end with.                                                                                                     | none             |
| `contains`   | Digits to embed in the PAN, placed straight after the `startsWith` digits, or after the 6-digit BIN.                                       | none             |
| `amount`     | How many cards to generate. Greater than 1 returns an array; 1 returns a single object.                                             | `1`              |
| `attributes` | Which fields to include in each card. A single string or an array of strings.                                                        | all six fields   |

Constraints and behaviour worth knowing:

- When a BIN is used (the default, or with `brand` / `issuer`), `contains` and `endsWith` together may be at most 8 digits. With your own `startsWith`, all three together may be at most 10 digits. Longer values throw.
- `brand` is only included in the output when it is known: when you pass `brand`, or when no filter is passed and a random BIN is picked. Filtering by `issuer` alone or passing `startsWith` returns cards without `brand`.
- An unknown brand throws `"<brand> is not a recognized brand"`. Verve is not supported yet (there are no Verve BINs in the table) and throws `"The verve brand is not available yet"`.
- An unknown issuer throws `"<issuer> is not a recognized issuer"`.
- Errors are thrown as plain strings for brand and issuer problems, and as `Error` objects for option-length problems.

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

## validatePAN(...pans)

Takes one or more PANs as separate arguments (strings or numbers; pass long numbers as strings, since numbers above 2^53 throw).

- With one argument it returns a boolean.
- With several it returns an object keyed by PAN, with a boolean for each.

```javascript
ccgen.validatePAN("4111111111111111"); // true
ccgen.validatePAN("4111111111111111", "5555555555554444");
// { "4111111111111111": true, "5555555555554444": true }
```

Limitation: any PAN shorter than 16 digits returns `false` before the Luhn check runs, so valid 13-digit Visa and 15-digit American Express numbers are reported as invalid.

## Known limitations

- Brand filtering currently resolves to a single BIN per brand, and combining `brand` with `issuer` only succeeds for Zenith Bank; other combinations throw `"BIN issued by <issuer> with brand <brand> is not available"`.
- Generated PANs are always 16 digits, including when the random BIN is the American Express one (Amex PANs are 15 digits).

## Next steps

- Add Verve BINs so `brand: "verve"` works.
- Support 13-, 15- and 19-digit PANs in both generation and `validatePAN`.
- Fix the brand index so brand and brand-plus-issuer filters draw from every matching BIN.
- Replace the old Travis CI setup with GitHub Actions.

## License

MIT
