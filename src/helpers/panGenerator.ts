import { CCGenError } from "../errors";
import { luhnSum } from "./luhnChecker";
import rng from "./randomNumberGenerator";

export const MIN_PAN_LENGTH = 12;
export const MAX_PAN_LENGTH = 19;

export interface PanOptions {
    /** Leading digits. With `startsWithIsBin`, these are a 6-digit BIN. */
    startsWith?: string;
    /** Digits placed straight after `startsWith` (or at index 7 without it). */
    contains?: string;
    /** Trailing digits. */
    endsWith?: string;
    /** Total PAN length, 12 to 19. Defaults to 16. */
    length?: number;
    /** True when `startsWith` came from the BIN table rather than the caller. */
    startsWithIsBin?: boolean;
}

function digitsOnly(name: string, value: string | undefined): string {
    if (value === undefined || value === "") return "";
    if (!/^\d+$/.test(value)) {
        throw new CCGenError(
            "INVALID_OPTION",
            `'${name}' must contain digits only, got "${value}"`
        );
    }
    return value;
}

/**
 * Generate a Luhn-valid PAN of the given length, honouring the fixed
 * prefix, embedded digits and suffix. One free digit is solved for so the
 * whole number passes the Luhn check.
 */
export default function panGenerator(options: PanOptions = {}): string {
    const length = options.length ?? 16;
    if (
        !Number.isInteger(length) ||
        length < MIN_PAN_LENGTH ||
        length > MAX_PAN_LENGTH
    ) {
        throw new CCGenError(
            "INVALID_OPTION",
            `PAN length must be an integer from ${MIN_PAN_LENGTH} to ${MAX_PAN_LENGTH}, got ${length}`
        );
    }

    const startsWith = digitsOnly("startsWith", options.startsWith);
    const contains = digitsOnly("contains", options.contains);
    const endsWith = digitsOnly("endsWith", options.endsWith);

    if (options.startsWithIsBin) {
        // BIN (6) + contains + endsWith must leave two free digits
        const max = length - 8;
        if (contains.length + endsWith.length > max) {
            throw new CCGenError(
                "INVALID_OPTION",
                `'contains' and 'endsWith' can be at most ${max} digits combined for a ${length}-digit PAN`
            );
        }
    } else {
        const max = length - 6;
        if (startsWith.length + contains.length + endsWith.length > max) {
            throw new CCGenError(
                "INVALID_OPTION",
                `'startsWith', 'contains' and 'endsWith' can be at most ${max} digits combined for a ${length}-digit PAN`
            );
        }
    }

    // null marks a free slot
    const slots: (number | null)[] = new Array(length).fill(null);
    const place = (digits: string, at: number) => {
        for (let i = 0; i < digits.length; i++)
            slots[at + i] = Number(digits[i]);
    };

    place(startsWith, 0);
    if (contains) {
        // Straight after startsWith; without one, from index 7, moved left if
        // it would run into endsWith
        const preferred = startsWith ? startsWith.length : 7;
        const latest = length - endsWith.length - contains.length - 1;
        place(
            contains,
            Math.min(preferred, Math.max(latest, startsWith.length))
        );
    }
    place(endsWith, length - endsWith.length);

    const free: number[] = [];
    slots.forEach((slot, i) => {
        if (slot === null) free.push(i);
    });
    // The rightmost free slot is solved for last, so the PAN passes Luhn
    const solveAt = free[free.length - 1];
    for (const i of free) slots[i] = Number(rng({ length: 1 }));

    // Doubling maps 0-9 onto every residue mod 10, so some digit always works
    for (let d = 0; d <= 9; d++) {
        slots[solveAt] = d;
        if (luhnSum(slots as number[]) % 10 === 0) break;
    }
    return slots.join("");
}
