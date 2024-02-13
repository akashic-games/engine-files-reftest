module.exports = {
    "root": true,
    "extends": ["@akashic/eslint-config"],
    "parserOptions": {
        "project": "tsconfig.eslint.json",
        "sourceType": "module"
    },
    "ignorePatterns": [
        "*.js",
        "**/*.d.ts"
    ]
};
