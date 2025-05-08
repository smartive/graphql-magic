import { config } from "@smartive/eslint-config";
import tsParser from "@typescript-eslint/parser";

export default [
    ...config('typescript'),
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 5,
            sourceType: "script",

            parserOptions: {
                project: "./tsconfig.eslint.json",
            },
        },

        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-floating-promises": ["error"],
            "no-constant-binary-expression": "error",

            "no-console": ["error", {
                allow: ["info", "warn", "error", "trace", "time", "timeEnd"],
            }],

            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: 'lodash',
                            message: 'Import [module] from lodash/[module] instead',
                        },
                    ],
                    patterns: [
                        {
                            group: ['lodash/set'],
                            message: 'Import [module] from lodash/fp/[module] instead',
                        },
                    ],
                },
            ],

            // Disable rules causing the most errors
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/prefer-nullish-coalescing": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "@typescript-eslint/no-base-to-string": "off",
            "@typescript-eslint/no-misused-promises": "off",
            "@typescript-eslint/require-await": "off",
            "@typescript-eslint/no-unsafe-function-type": "off",
            "eqeqeq": "off",
        },
    },
];
