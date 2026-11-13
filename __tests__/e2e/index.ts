import { CCGen, CCGenError, ISSUERS, IssuerKey } from "../../src";
import binList from "../../src/lists/bins";
import { brandFromOption } from "../../src/lists/brands";
import { issuerKeyFor } from "../../src/lists/issuers";
import luhnChecker from "../../src/helpers/luhnChecker";

const ccgen = new CCGen();
const issuerKeys = Object.keys(ISSUERS) as IssuerKey[];

function thrown(fn: () => unknown): CCGenError {
    try {
        fn();
    } catch (error) {
        expect(error).toBeInstanceOf(CCGenError);
        expect(error).toBeInstanceOf(Error);
        return error as CCGenError;
    }
    throw new Error("expected a CCGenError");
}

describe("generateCC", () => {
    test("returns a single card with every field by default", () => {
        const card = ccgen.generateCC();
        expect(Array.isArray(card)).toBe(false);
        expect(card).toHaveProperty("name");
        expect(card).toHaveProperty("cvv");
        expect(card).toHaveProperty("expiryDate");
        expect(card).toHaveProperty("brand");
        expect(luhnChecker(card.pan)).toBe(true);
    });

    test("returns an array whenever amount is passed, even 1", () => {
        expect(ccgen.generateCC({ amount: 1 })).toHaveLength(1);
        expect(ccgen.generateCC({ amount: 20 })).toHaveLength(20);
    });

    test.each([0, -1, 2.5, NaN])("rejects amount %p", (amount) => {
        expect(thrown(() => ccgen.generateCC({ amount })).code).toBe(
            "INVALID_OPTION"
        );
    });

    test("only ever returns Luhn-valid PANs of the right length", () => {
        const optionSets = [
            {},
            { brand: "visa" },
            { brand: "mastercard", endsWith: "42" },
            { brand: "amex", contains: "12", endsWith: "9" },
            { issuer: "gtb", contains: "777" },
            { brand: "visa", issuer: "zenith", endsWith: "123" },
            { startsWith: "4111", endsWith: "99" },
            { startsWith: "37", contains: "1" }
        ];
        let checked = 0;
        for (const options of optionSets) {
            for (const card of ccgen.generateCC({ ...options, amount: 500 })) {
                const pan = card.pan!;
                expect(luhnChecker(pan)).toBe(true);
                expect(pan).toHaveLength(/^3[47]/.test(pan) ? 15 : 16);
                checked++;
            }
        }
        expect(checked).toBe(4000);
    });

    describe("brand", () => {
        test("draws from every BIN of the brand, not just one", () => {
            for (const brand of ["visa", "mastercard"]) {
                const bins = new Set<string>();
                for (const card of ccgen.generateCC({ brand, amount: 500 })) {
                    bins.add(card.pan!.slice(0, 6));
                    expect(card.brand).toBe(brand.toUpperCase());
                }
                expect(bins.size).toBeGreaterThan(10);
            }
        });

        test("is case-insensitive and accepts amex as an alias", () => {
            expect(ccgen.generateCC({ brand: "VISA" }).pan).toMatch(/^4/);
            const amex = ccgen.generateCC({ brand: "amex" });
            expect(amex.brand).toBe("AMERICAN EXPRESS");
            expect(amex.pan).toMatch(/^3[47]\d{13}$/);
            expect(amex.cvv).toMatch(/^\d{4}$/);
        });

        test("ignores startsWith when a brand is given", () => {
            expect(
                ccgen.generateCC({ brand: "mastercard", startsWith: "4111" })
                    .brand
            ).toBe("MASTERCARD");
        });

        test("throws for Verve, which has no BINs yet", () => {
            const error = thrown(() => ccgen.generateCC({ brand: "verve" }));
            expect(error.code).toBe("BRAND_NOT_AVAILABLE");
            expect(error.message).toBe(
                'Brand "verve" is not available yet: there are no BINs for it'
            );
        });

        test("throws for an unknown brand", () => {
            const error = thrown(() => ccgen.generateCC({ brand: "discover" }));
            expect(error.code).toBe("UNKNOWN_BRAND");
            expect(error.message).toBe('Unknown brand "discover"');
        });
    });

    describe("issuer", () => {
        test.each(issuerKeys)(
            "returns %s cards with brand and issuer",
            (key) => {
                const card = ccgen.generateCC({ issuer: key });
                expect(card.issuer).toBe(ISSUERS[key]);
                expect(card.brand).toBeDefined();
            }
        );

        test("throws the same error for an unknown issuer with or without a brand", () => {
            for (const options of [
                { issuer: "test" },
                { issuer: "test", brand: "visa" }
            ]) {
                const error = thrown(() => ccgen.generateCC(options));
                expect(error.code).toBe("UNKNOWN_ISSUER");
                expect(error.message).toBe('Unknown issuer "test"');
            }
        });

        test("includes the issuer whenever the BIN's bank is known", () => {
            const withIssuer = ccgen
                .generateCC({ amount: 300 })
                .filter((card) => card.issuer);
            expect(withIssuer.length).toBeGreaterThan(0);
        });
    });

    test("supports brand + issuer for every pair that has BINs", () => {
        for (const brandOption of ["visa", "mastercard"]) {
            for (const issuer of issuerKeys) {
                const expected = new Set(
                    binList
                        .filter(
                            (b) =>
                                issuerKeyFor(b.issuer) === issuer &&
                                brandFromOption(b.brand) ===
                                    brandFromOption(brandOption)
                        )
                        .map((b) => b.bin)
                );
                const run = () =>
                    ccgen.generateCC({
                        brand: brandOption,
                        issuer,
                        amount: 20
                    });
                if (expected.size === 0) {
                    const error = thrown(run);
                    expect(error.code).toBe("NO_MATCHING_BIN");
                    expect(error.message).toBe(
                        `No BINs for brand "${brandOption}" and issuer "${issuer}"`
                    );
                } else {
                    for (const card of run()) {
                        expect(expected.has(card.pan!.slice(0, 6))).toBe(true);
                        expect(card.issuer).toBe(ISSUERS[issuer]);
                    }
                }
            }
        }
    });

    describe("startsWith", () => {
        test("uses the table's details when it begins with a known BIN", () => {
            const card = ccgen.generateCC({ startsWith: "4071271" });
            expect(card.pan).toMatch(/^4071271/);
            expect(card.brand).toBe("VISA");
            expect(card.issuer).toBe("Zenith Bank PLC");
        });

        test("infers brand and length from the prefix otherwise", () => {
            const amex = ccgen.generateCC({ startsWith: "34" });
            expect(amex.brand).toBe("AMERICAN EXPRESS");
            expect(amex.pan).toHaveLength(15);
            const mc = ccgen.generateCC({ startsWith: 2221 });
            expect(mc.brand).toBe("MASTERCARD");
            const unknown = ccgen.generateCC({ startsWith: 1234 });
            expect(unknown).not.toHaveProperty("brand");
            expect(unknown.pan).toHaveLength(16);
        });

        test("rejects unsafe numbers and non-digits", () => {
            expect(
                thrown(() =>
                    ccgen.generateCC({ startsWith: 12345678901234567890 })
                ).code
            ).toBe("INVALID_OPTION");
            expect(
                thrown(() => ccgen.generateCC({ endsWith: "4a" })).code
            ).toBe("INVALID_OPTION");
        });
    });

    test("returns only the requested attributes", () => {
        expect(Object.keys(ccgen.generateCC({ attributes: "pan" }))).toEqual([
            "pan"
        ]);
        expect(
            Object.keys(ccgen.generateCC({ attributes: ["pan", "cvv"] }))
        ).toEqual(["pan", "cvv"]);
    });
});

describe("multiple instances", () => {
    test("a second instance filters by issuer exactly like the first", () => {
        const snapshot = JSON.stringify(binList);
        const first = new CCGen();
        const second = new CCGen();
        for (const issuer of issuerKeys) {
            expect(first.generateCC({ issuer }).issuer).toBe(ISSUERS[issuer]);
            expect(second.generateCC({ issuer }).issuer).toBe(ISSUERS[issuer]);
        }
        expect(JSON.stringify(binList)).toBe(snapshot);
    });
});

describe("validatePAN", () => {
    test.each([
        ["12-digit", "123456789007"],
        ["13-digit Visa", "4222222222222"],
        ["15-digit Amex", "378282246310005"],
        ["16-digit Visa", "4111111111111111"],
        ["19-digit", "6011000000000000001"]
    ])("accepts a valid %s PAN", (_label, pan) => {
        expect(luhnChecker(pan)).toBe(true);
        expect(ccgen.validatePAN(pan)).toBe(true);
    });

    test("rejects Luhn-valid numbers outside 12 to 19 digits", () => {
        expect(luhnChecker("12345678903")).toBe(true);
        expect(ccgen.validatePAN("12345678903")).toBe(false);
        expect(luhnChecker("15722340029689988343")).toBe(true);
        expect(ccgen.validatePAN("15722340029689988343")).toBe(false);
    });

    test("rejects Luhn failures and non-digits", () => {
        expect(ccgen.validatePAN("4007784872621338")).toBe(false);
        expect(ccgen.validatePAN("4111 1111 1111 1111")).toBe(false);
        expect(ccgen.validatePAN(-4111111111111111)).toBe(false);
    });

    test("accepts safe-integer numbers and rejects unsafe ones", () => {
        expect(ccgen.validatePAN(4007784877621338)).toBe(true);
        expect(thrown(() => ccgen.validatePAN(6011000000000000001)).code).toBe(
            "INVALID_OPTION"
        );
    });

    test("returns an object keyed by PAN for several arguments", () => {
        expect(
            ccgen.validatePAN(
                4007784877621338,
                "4007784872621338",
                "378282246310005"
            )
        ).toEqual({
            "4007784877621338": true,
            "4007784872621338": false,
            "378282246310005": true
        });
    });
});
