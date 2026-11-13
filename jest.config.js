/** @type {import('jest').Config} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    testMatch: ["<rootDir>/__tests__/**/*.ts"],
    // The BIN and name tables are data, not logic
    collectCoverageFrom: [
        "src/**/*.ts",
        "!src/lists/bins.ts",
        "!src/lists/names.ts"
    ],
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov"],
    clearMocks: true
};
