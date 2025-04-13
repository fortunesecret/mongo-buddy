module.exports = {
    clearMocks: true,
    collectCoverage: false,
    coverageDirectory: "coverage",
    coverageProvider: "v8",
    testEnvironment: "node",
    testMatch: [
        "**/__tests__/**/*.js",
        "**/?(*.)+(spec|test).js"
    ],
    testPathIgnorePatterns: [
        "/node_modules/"
    ],
    verbose: true,
    testTimeout: 30000,
};
