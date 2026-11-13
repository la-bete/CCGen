/** Issuer keys accepted by `options.issuer`, and the bank name returned for each. */
export const ISSUERS = {
    fcmb: "First City Monument Bank",
    wema: "Wema Bank PLC",
    union: "Union Bank of Nigeria",
    access: "Access Bank PLC",
    zenith: "Zenith Bank PLC",
    gtb: "Guaranty Trust Bank PLC",
    ecobank: "Ecobank Nigeria PLC",
    stanbic: "Stanbic IBTC Bank",
    uba: "United Bank for Africa PLC",
    intercontinental: "Intercontinental Bank PLC",
    polaris: "Polaris Bank PLC",
    fbn: "First Bank of Nigeria PLC",
    scbn: "Standard Chartered Bank"
} as const;

export type IssuerKey = keyof typeof ISSUERS;

/**
 * Patterns that map the free-text issuer names in the BIN table to an issuer
 * key. Skye Bank became Polaris Bank in 2018, so its BINs map to `polaris`.
 */
const ISSUER_PATTERNS: ReadonlyArray<readonly [RegExp, IssuerKey]> = [
    [/first city monument|^fcmb$/i, "fcmb"],
    [/wema/i, "wema"],
    [/union/i, "union"],
    [/access/i, "access"],
    [/zenith/i, "zenith"],
    [/guaranty trust bank/i, "gtb"],
    [/ecobank/i, "ecobank"],
    [/stanbic ibtc/i, "stanbic"],
    [/united bank for africa/i, "uba"],
    [/intercontinental bank/i, "intercontinental"],
    [/skye/i, "polaris"],
    [/standard chartered bank nigeria|^standard chartered$/i, "scbn"],
    [/first bank/i, "fbn"]
];

/** Map a raw issuer name from the BIN table to an issuer key, or null. */
export function issuerKeyFor(rawIssuer: string): IssuerKey | null {
    for (const [pattern, key] of ISSUER_PATTERNS) {
        if (pattern.test(rawIssuer)) return key;
    }
    return null;
}

export function isIssuerKey(value: string): value is IssuerKey {
    return Object.prototype.hasOwnProperty.call(ISSUERS, value);
}
