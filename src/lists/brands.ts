/** Brand names as they appear in the BIN table and in generated cards. */
export type Brand = "VISA" | "MASTERCARD" | "AMERICAN EXPRESS" | "MAESTRO";

/** Accepted spellings for `options.brand` (matched case-insensitively). */
const BRAND_ALIASES: Readonly<Record<string, Brand>> = {
    visa: "VISA",
    mastercard: "MASTERCARD",
    "american express": "AMERICAN EXPRESS",
    amex: "AMERICAN EXPRESS",
    maestro: "MAESTRO"
};

/** Brands that exist but have no BINs in the table yet. */
export const UNAVAILABLE_BRANDS: readonly string[] = ["verve"];

export function brandFromOption(value: string): Brand | undefined {
    return BRAND_ALIASES[value.trim().toLowerCase()];
}

/**
 * PAN length to generate for a brand. American Express PANs are 15 digits;
 * Visa, Mastercard and Maestro are generated at the common 16.
 */
export function panLengthFor(brand: Brand | undefined): number {
    return brand === "AMERICAN EXPRESS" ? 15 : 16;
}

/**
 * Best-effort brand detection from the leading digits of a PAN, used when the
 * caller supplies their own `startsWith`. Returns undefined when the prefix is
 * too short or not in a range covered here.
 */
export function brandFromPrefix(prefix: string): Brand | undefined {
    if (/^4/.test(prefix)) return "VISA";
    if (/^3[47]/.test(prefix)) return "AMERICAN EXPRESS";
    if (/^5[1-5]/.test(prefix)) return "MASTERCARD";
    if (prefix.length >= 4) {
        const first4 = Number(prefix.slice(0, 4));
        if (first4 >= 2221 && first4 <= 2720) return "MASTERCARD";
    }
    return undefined;
}
