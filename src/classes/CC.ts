import rng from "../helpers/randomNumberGenerator";
import names from "../lists/names";

export const CARD_ATTRIBUTES = [
    "name",
    "cvv",
    "pan",
    "expiryDate",
    "brand",
    "issuer"
] as const;

export type CardAttribute = (typeof CARD_ATTRIBUTES)[number];

/**
 * A generated test card. Which fields are present depends on
 * `options.attributes`; `brand` and `issuer` are also left out when they are
 * not known for the PAN.
 */
export type Card = Partial<Record<CardAttribute, string>>;

function isCardAttribute(value: unknown): value is CardAttribute {
    return (CARD_ATTRIBUTES as readonly unknown[]).includes(value);
}

/** Builds the card details that go with a PAN. */
export default class CC {
    private readonly fields: Readonly<
        Record<CardAttribute, string | undefined>
    >;
    private readonly attributes: readonly CardAttribute[];

    /**
     * @param pan     The generated PAN
     * @param brand   Brand name, e.g. "VISA", if known
     * @param issuer  Issuing bank's name, if known
     * @param attrs   Which fields to include; all of them when omitted or invalid
     */
    constructor(
        pan: string,
        brand?: string,
        issuer?: string,
        attrs?: CardAttribute | readonly CardAttribute[]
    ) {
        this.fields = {
            name: CC.randomName(),
            cvv: CC.randomCVV(pan),
            pan,
            expiryDate: CC.randomExpiryDate(),
            brand: brand ? brand.toUpperCase() : undefined,
            issuer: issuer || undefined
        };
        if (typeof attrs === "string") {
            this.attributes = [attrs];
        } else if (Array.isArray(attrs)) {
            this.attributes = attrs;
        } else {
            this.attributes = CARD_ATTRIBUTES;
        }
    }

    private static randomName(): string {
        const first = names[Number(rng({ min: 0, max: names.length - 1 }))];
        const last = names[Number(rng({ min: 0, max: names.length - 1 }))];
        return `${last} ${first}`;
    }

    /** American Express uses a 4-digit security code; other brands use 3. */
    private static randomCVV(pan: string): string {
        return rng({ length: /^3[47]/.test(pan) ? 4 : 3 });
    }

    private static randomExpiryDate(): string {
        const month = rng({ min: 1, max: 12 }).padStart(2, "0");
        const currentYear = new Date().getFullYear() % 100;
        const year = rng({ min: currentYear + 3, max: currentYear + 15 });
        return `${month}/${String(Number(year) % 100).padStart(2, "0")}`;
    }

    get data(): Card {
        const result: Card = {};
        for (const attr of this.attributes) {
            if (!isCardAttribute(attr)) continue;
            const value = this.fields[attr];
            if (value) result[attr] = value;
        }
        return result;
    }
}
