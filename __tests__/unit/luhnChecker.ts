import luhnChecker, { luhnSum } from "../../src/helpers/luhnChecker";

describe("luhnChecker", () => {
    test("returns false for anything that is not a string of digits", () => {
        expect(luhnChecker(true)).toBe(false);
        expect(luhnChecker([])).toBe(false);
        expect(luhnChecker({})).toBe(false);
        expect(luhnChecker(4007784877621338)).toBe(false);
        expect(luhnChecker("")).toBe(false);
        expect(luhnChecker("test1234")).toBe(false);
        expect(luhnChecker("4007 7848 7762 1338")).toBe(false);
    });

    test("returns false when the Luhn check fails", () => {
        expect(luhnChecker("1407784877612338")).toBe(false);
        expect(luhnChecker("4007784872621338")).toBe(false);
    });

    test("returns true for Luhn-valid numbers of any length", () => {
        expect(luhnChecker("4007784877621338")).toBe(true);
        expect(luhnChecker("378282246310005")).toBe(true);
        expect(luhnChecker("4222222222222")).toBe(true);
        expect(luhnChecker("15722340029689988343")).toBe(true);
    });

    test("luhnSum doubles every second digit from the right", () => {
        // From the right, 3 and 1 are doubled: 4 + 6 + 2 + 2
        expect(luhnSum([1, 2, 3, 4])).toBe(2 + 2 + 6 + 4);
        // 9 doubled is 18 -> 9
        expect(luhnSum([9, 0])).toBe(9);
    });
});
