import { CCGenError } from "../errors";
import luhnChecker from "../helpers/luhnChecker";
import panGen, {
    MAX_PAN_LENGTH,
    MIN_PAN_LENGTH
} from "../helpers/panGenerator";
import rng from "../helpers/randomNumberGenerator";
import binList from "../lists/bins";
import {
    Brand,
    brandFromOption,
    brandFromPrefix,
    panLengthFor,
    UNAVAILABLE_BRANDS
} from "../lists/brands";
import {
    isIssuerKey,
    ISSUERS,
    IssuerKey,
    issuerKeyFor
} from "../lists/issuers";
import CC, { Card, CardAttribute } from "./CC";

export interface GenerateCCOptions {
    /** `visa`, `mastercard`, `amex` / `american express` or `maestro`. */
    brand?: string;
    /** One of the keys of `ISSUERS`, e.g. `gtb`. */
    issuer?: string;
    /** Your own leading digits. Ignored when `brand` or `issuer` is set. */
    startsWith?: string | number;
    /** Digits to place straight after the prefix. */
    contains?: string | number;
    /** Digits the PAN should end with. */
    endsWith?: string | number;
    /** Fields to include in each card. Defaults to all of them. */
    attributes?: CardAttribute | readonly CardAttribute[];
}

/** A BIN from the table, with brand and issuer resolved once. */
interface IndexedBin {
    readonly bin: string;
    readonly brand: Brand | undefined;
    readonly issuer: IssuerKey | null;
}

function toDigitString(name: string, value: string | number | undefined) {
    if (value === undefined || value === "") return undefined;
    if (typeof value === "number" && !Number.isSafeInteger(value)) {
        throw new CCGenError(
            "INVALID_OPTION",
            `'${name}' is too large to be passed as a number; pass it as a string`
        );
    }
    return String(value);
}

function pick<T>(items: readonly T[]): T {
    return items[Number(rng({ min: 0, max: items.length - 1 }))];
}

export default class CCGen {
    /** Every BIN in the table, resolved once. The source table is never modified. */
    private readonly bins: readonly IndexedBin[];
    private readonly byBrand: ReadonlyMap<Brand, readonly IndexedBin[]>;
    private readonly byIssuer: ReadonlyMap<IssuerKey, readonly IndexedBin[]>;

    constructor() {
        const byBrand = new Map<Brand, IndexedBin[]>();
        const byIssuer = new Map<IssuerKey, IndexedBin[]>();
        this.bins = binList.map((record) => {
            const entry: IndexedBin = {
                bin: record.bin,
                brand: brandFromOption(record.brand),
                issuer: issuerKeyFor(record.issuer)
            };
            if (entry.brand) {
                const list = byBrand.get(entry.brand) ?? [];
                list.push(entry);
                byBrand.set(entry.brand, list);
            }
            if (entry.issuer) {
                const list = byIssuer.get(entry.issuer) ?? [];
                list.push(entry);
                byIssuer.set(entry.issuer, list);
            }
            return entry;
        });
        this.byBrand = byBrand;
        this.byIssuer = byIssuer;
    }

    /** Generate one card. */
    generateCC(options?: GenerateCCOptions): Card;
    /** Generate `amount` cards. Always returns an array, even for 1. */
    generateCC(options: GenerateCCOptions & { amount: number }): Card[];
    generateCC(options: GenerateCCOptions & { amount?: number }): Card | Card[];
    generateCC(
        options: GenerateCCOptions & { amount?: number } = {}
    ): Card | Card[] {
        if (options.amount === undefined) return this.generateOne(options);
        const amount = Number(options.amount);
        if (!Number.isInteger(amount) || amount < 1) {
            throw new CCGenError(
                "INVALID_OPTION",
                `'amount' must be a positive integer, got ${options.amount}`
            );
        }
        return Array.from({ length: amount }, () => this.generateOne(options));
    }

    private candidates(brandOption?: string, issuerOption?: string) {
        let brand: Brand | undefined;
        if (brandOption !== undefined) {
            const key = brandOption.trim().toLowerCase();
            if (UNAVAILABLE_BRANDS.includes(key)) {
                throw new CCGenError(
                    "BRAND_NOT_AVAILABLE",
                    `Brand "${brandOption}" is not available yet: there are no BINs for it`
                );
            }
            brand = brandFromOption(key);
            if (!brand) {
                throw new CCGenError(
                    "UNKNOWN_BRAND",
                    `Unknown brand "${brandOption}"`
                );
            }
        }
        let issuer: IssuerKey | undefined;
        if (issuerOption !== undefined) {
            const key = issuerOption.trim().toLowerCase();
            if (!isIssuerKey(key)) {
                throw new CCGenError(
                    "UNKNOWN_ISSUER",
                    `Unknown issuer "${issuerOption}"`
                );
            }
            issuer = key;
        }

        let list: readonly IndexedBin[] = brand
            ? (this.byBrand.get(brand) ?? [])
            : issuer
              ? (this.byIssuer.get(issuer) ?? [])
              : this.bins;
        if (brand && issuer) list = list.filter((b) => b.issuer === issuer);
        if (list.length === 0) {
            const what = [
                brand && `brand "${brandOption}"`,
                issuer && `issuer "${issuerOption}"`
            ]
                .filter(Boolean)
                .join(" and ");
            throw new CCGenError("NO_MATCHING_BIN", `No BINs for ${what}`);
        }
        return list;
    }

    private generateOne(options: GenerateCCOptions): Card {
        const contains = toDigitString("contains", options.contains);
        const endsWith = toDigitString("endsWith", options.endsWith);
        const startsWith = toDigitString("startsWith", options.startsWith);

        let pan: string;
        let brand: Brand | undefined;
        let issuer: IssuerKey | null = null;

        const useTable =
            options.brand !== undefined ||
            options.issuer !== undefined ||
            startsWith === undefined;

        if (useTable) {
            const chosen = pick(this.candidates(options.brand, options.issuer));
            brand = chosen.brand;
            issuer = chosen.issuer;
            pan = panGen({
                startsWith: chosen.bin,
                startsWithIsBin: true,
                contains,
                endsWith,
                length: panLengthFor(brand)
            });
        } else {
            // Caller's own prefix: use the table's details if it starts with
            // a known BIN, otherwise infer the brand from the prefix
            const known = this.bins.find((b) => startsWith!.startsWith(b.bin));
            brand = known ? known.brand : brandFromPrefix(startsWith!);
            issuer = known ? known.issuer : null;
            pan = panGen({
                startsWith,
                contains,
                endsWith,
                length: panLengthFor(brand)
            });
        }

        return new CC(
            pan,
            brand,
            issuer ? ISSUERS[issuer] : undefined,
            options.attributes
        ).data;
    }

    /**
     * Check one PAN: true when it is 12 to 19 digits and passes the Luhn check.
     * Numbers above Number.MAX_SAFE_INTEGER cannot be represented exactly, so
     * they throw; pass long PANs as strings.
     */
    validatePAN(pan: string | number): boolean;
    /** Check several PANs. Returns an object keyed by PAN. */
    validatePAN(
        first: string | number,
        second: string | number,
        ...rest: (string | number)[]
    ): Record<string, boolean>;
    validatePAN(
        ...pans: (string | number)[]
    ): boolean | Record<string, boolean> {
        const result: Record<string, boolean> = {};
        for (const pan of pans) {
            result[String(pan)] = CCGen.isValidPAN(pan);
        }
        return pans.length === 1 ? result[String(pans[0])] : result;
    }

    private static isValidPAN(pan: string | number): boolean {
        if (typeof pan === "number" && !Number.isSafeInteger(pan)) {
            throw new CCGenError(
                "INVALID_OPTION",
                `${pan} is too large to be passed as a number; pass it as a string`
            );
        }
        const digits = String(pan);
        return (
            digits.length >= MIN_PAN_LENGTH &&
            digits.length <= MAX_PAN_LENGTH &&
            luhnChecker(digits)
        );
    }
}
