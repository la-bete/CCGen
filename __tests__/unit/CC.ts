import CC from "../../src/classes/CC";

describe("CC", () => {
    test("includes every known field by default", () => {
        const data = new CC("4111111111111111", "visa", "Zenith Bank PLC").data;
        expect(data).toEqual({
            name: expect.any(String),
            cvv: expect.stringMatching(/^\d{3}$/),
            pan: "4111111111111111",
            expiryDate: expect.stringMatching(/^(0[1-9]|1[0-2])\/\d{2}$/),
            brand: "VISA",
            issuer: "Zenith Bank PLC"
        });
    });

    test("leaves out brand and issuer when they are not known", () => {
        const data = new CC("1234567890123456").data;
        expect(data).not.toHaveProperty("brand");
        expect(data).not.toHaveProperty("issuer");
        expect(data).toHaveProperty("pan", "1234567890123456");
    });

    test("uses a 4-digit CVV for American Express", () => {
        expect(new CC("376862000000000").data.cvv).toMatch(/^\d{4}$/);
    });

    test("names never contain 'undefined'", () => {
        for (let i = 0; i < 2000; i++) {
            expect(new CC("4111111111111111").data.name).not.toMatch(
                /undefined/
            );
        }
    });

    test("expiry dates are 3 to 15 years ahead and cover every month", () => {
        const months = new Set<string>();
        const thisYear = new Date().getFullYear() % 100;
        for (let i = 0; i < 2000; i++) {
            const [month, year] = new CC(
                "4111111111111111"
            ).data.expiryDate!.split("/");
            months.add(month);
            const ahead = (Number(year) - thisYear + 100) % 100;
            expect(ahead).toBeGreaterThanOrEqual(3);
            expect(ahead).toBeLessThanOrEqual(15);
        }
        expect(months.size).toBe(12);
    });

    test("includes only the requested attributes", () => {
        expect(
            Object.keys(
                new CC("4111111111111111", "visa", undefined, "pan").data
            )
        ).toEqual(["pan"]);
        expect(
            Object.keys(
                new CC("4111111111111111", "visa", undefined, ["pan", "brand"])
                    .data
            )
        ).toEqual(["pan", "brand"]);
    });

    test("skips unknown attributes and falls back to all fields for invalid input", () => {
        const skipped = new CC("4111111111111111", "visa", undefined, [
            "pan",
            // @ts-expect-error testing runtime handling of bad input
            "test"
        ]).data;
        expect(Object.keys(skipped)).toEqual(["pan"]);

        // @ts-expect-error testing runtime handling of bad input
        const all = new CC("4111111111111111", "visa", undefined, {}).data;
        expect(Object.keys(all)).toEqual([
            "name",
            "cvv",
            "pan",
            "expiryDate",
            "brand"
        ]);
    });
});
