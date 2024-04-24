import js from '@eslint/js'
import stylisticJs from '@stylistic/eslint-plugin-js'
import eslintConfigPrettier from 'eslint-config-prettier'
import importPlugin from 'eslint-plugin-import'
import globals from 'globals'

export default [
    js.configs.recommended,
    eslintConfigPrettier,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                preferBuiltins: true
            },
            ecmaVersion: 2022,
            sourceType: 'module',
        },
        plugins: {
            import: importPlugin,
            '@stylistic/js': stylisticJs,
        },
        rules: {
            'indent': ['error', 4, { SwitchCase: 1 }],
            'semi': ['error', 'never'],
            'max-len': [
                'error',
                100,
                2,
                {
                    ignoreUrls: true,
                    ignoreComments: false,
                    ignoreRegExpLiterals: true,
                    ignoreStrings: true,
                    ignoreTemplateLiterals: true,
                },
            ],
            'no-multi-spaces': 'error',
            'no-trailing-spaces': 'error',

            'import/prefer-default-export': 'off',
            'import/no-default-export': 'error',

            'import/order': [
                'error',
                {
                    groups: [
                        'builtin',
                        'external',
                        'internal',
                        'parent',
                        'sibling',
                        'index',
                        'object',
                        'unknown',
                    ],
                    pathGroups: [
                        { pattern: 'src/**', group: 'internal' },
                    ],
                    pathGroupsExcludedImportTypes: ['builtin'],
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true,
                    },
                    'newlines-between': 'never',
                },
            ],

            '@stylistic/js/no-multiple-empty-lines': 'error',
            '@stylistic/js/quotes': ['error', 'single'],
            '@stylistic/js/object-curly-spacing': ['error', 'always']
        },
        ignores: [
            '!**/*.js',
            'node_modules',
            'build'
        ],
    },
    {
        files: ['eslint.config.js'],
        rules: {
            'import/no-default-export': 'off'
        }
    },
]
