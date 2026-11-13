import panGenerator from "../../src/helpers/panGenerator";
import luhnChecker from "../../src/helpers/luhnChecker";
import { CCGenError } from "../../src/errors";

describe("panGenerator", () => {
    test("returns a 16-digit Luhn-valid PAN by default", () => {
        const pan = panGenerator();
        expect(pan).toMatch(/^\d{16}$/);
        expect(luhnChecker(pan)).toBe(true);
    });

    test.each([12, 13, 15, 16, 19])(
        "returns a Luhn-valid %i-digit PAN when asked",
        (length) => {
            for (let i = 0; i < 200; i++) {
                const pan = panGenerator({ length });
                expect(pan).toHaveLength(length);
                expect(luhnChecker(pan)).toBe(true);
            }
        }
    );

    test.each([11, 20, 15.5])("rejects a length of %p", (length) => {
        expect(() => panGenerator({ length })).toThrow(CCGenError);
    });

    test("honours startsWith, contains and endsWith together", () => {
        for (let i = 0; i < 200; i++) {
            const pan = panGenerator({
                startsWith: "1572",
                contains: "234",
                endsWith: "347"
            });
            expect(pan.startsWith("1572234")).toBe(true);
            expect(pan.endsWith("347")).toBe(true);
            expect(luhnChecker(pan)).toBe(true);
        }
    });

    test("places contains after index 7 when there is no prefix", () => {
        const pan = panGenerator({ contains: "23456" });
        expect(pan.slice(7, 12)).toBe("23456");
        expect(luhnChecker(pan)).toBe(true);
    });

    test("keeps contains clear of a long endsWith", () => {
        for (let i = 0; i < 100; i++) {
            const pan = panGenerator({ contains: "11111", endsWith: "22222" });
            expect(pan.includes("11111")).toBe(true);
            expect(pan.endsWith("22222")).toBe(true);
            expect(luhnChecker(pan)).toBe(true);
        }
    });

    test("allows contains + endsWith up to length - 8 after a BIN", () => {
        const pan = panGenerator({
            startsWith: "157235",
            contains: "2345",
            endsWith: "3474",
            startsWithIsBin: true
        });
        expect(pan.startsWith("1572352345")).toBe(true);
        expect(pan.endsWith("3474")).toBe(true);
        expect(luhnChecker(pan)).toBe(true);

        const amex = panGenerator({
            startsWith: "376862",
            contains: "123",
            endsWith: "4567",
            startsWithIsBin: true,
            length: 15
        });
        expect(amex).toHaveLength(15);
        expect(luhnChecker(amex)).toBe(true);
    });

    test("rejects modifiers that leave too few free digits", () => {
        expect(() =>
            panGenerator({
                startsWith: "157235",
                contains: "2345",
                endsWith: "34745",
                startsWithIsBin: true
            })
        ).toThrow(
            "'contains' and 'endsWith' can be at most 8 digits combined for a 16-digit PAN"
        );
        expect(() =>
            panGenerator({
                startsWith: "376862",
                contains: "1234",
                endsWith: "5678",
                startsWithIsBin: true,
                length: 15
            })
        ).toThrow("at most 7 digits combined for a 15-digit PAN");
        expect(() => panGenerator({ startsWith: "12344567890" })).toThrow(
            "'startsWith', 'contains' and 'endsWith' can be at most 10 digits combined for a 16-digit PAN"
        );
    });

    test("rejects non-digit modifiers", () => {
        expect(() => panGenerator({ endsWith: "12a" })).toThrow(
            `'endsWith' must contain digits only, got "12a"`
        );
    });
});
