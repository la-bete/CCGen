import rng from "../../src/helpers/randomNumberGenerator";

describe("Random Number Generator", () => {
    test("should generate numbers greater than the min and lesser than the max passed in", () => {
        for (let i = 0; i < 1000; i++) {
            const result = rng({
                min: 1000,
                max: 10000
            });
            expect(Number(result)).toBeLessThanOrEqual(10000);
            expect(Number(result)).toBeGreaterThanOrEqual(1000);
        }
    });

    test("should be able to return both min and max", () => {
        const seen = new Set<string>();
        for (let i = 0; i < 2000; i++) {
            seen.add(rng({ min: 1, max: 12 }));
        }
        expect([...seen].map(Number).sort((a, b) => a - b)).toEqual([
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
        ]);
    });

    test("should spread results evenly between min and max", () => {
        const counts = [0, 0, 0, 0];
        const draws = 40000;
        for (let i = 0; i < draws; i++) {
            counts[Number(rng({ min: 0, max: 3 }))]++;
        }
        for (const count of counts) {
            // Each bucket expects 10000; allow a wide margin
            expect(count).toBeGreaterThan(9000);
            expect(count).toBeLessThan(11000);
        }
    });

    test("should reverse min and max silently if max is less than min", () => {
        const result = rng({
            min: 100000,
            max: 10000
        });
        expect(Number(result)).toBeLessThanOrEqual(100000);
        expect(Number(result)).toBeGreaterThanOrEqual(10000);
    });

    test("should return a number with 'length' digits", () => {
        for (let i = 0; i < 1000; i++) {
            const result = rng({
                length: i
            });
            expect(result.length).toEqual(i);
        }
    });

    test("should throw an error if invalid numbers are passed in", () => {
        //@ts-ignore
        expect(() => rng(true)).toThrow(
            "Random Number Generator expects an object argument, got 'true'"
        );
        expect(() =>
            rng({
                min: "1234",
                //@ts-ignore
                max: {}
            })
        ).toThrow(
            "Random Number Generator requires a numeric max argument, got '{}'"
        );
        expect(() =>
            rng({
                length: "test1234"
            })
        ).toThrow(
            "Random Number Generator requires a numeric length argument, got 'test1234'"
        );
        expect(() =>
            rng({
                //@ts-ignore
                min: {},
                //@ts-ignore
                max: []
            })
        ).toThrow(
            "Random Number Generator requires a numeric min argument, got '{}'"
        );
    });
});
