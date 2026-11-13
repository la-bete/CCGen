/**
 * Sum of the Luhn digit weights: every second digit from the right is
 * doubled, with 9 subtracted when that exceeds 9.
 */
export function luhnSum(digits: readonly number[]): number {
    let sum = 0;
    for (let i = digits.length - 1, double = false; i >= 0; i--) {
        let d = digits[i];
        if (double) {
            d *= 2;
            if (d > 9) d -= 9;
        }
        sum += d;
        double = !double;
    }
    return sum;
}

/**
 * True when `digits` is a non-empty string of digits that passes the Luhn
 * check. Anything else returns false. Length is not checked here.
 */
export default function luhnChecker(digits: unknown): boolean {
    if (typeof digits !== "string" || !/^\d+$/.test(digits)) return false;
    return luhnSum(Array.from(digits, Number)) % 10 === 0;
}
