module.exports = {
    parser: '@typescript-eslint/parser',
    root: true,
    extends: ['plugin:@typescript-eslint/recommended', 'plugin:svelte/recommended', 'prettier'],
    rules: {
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    },
    overrides: [
        {
            files: ['*.svelte'],
            parser: 'svelte-eslint-parser',
            parserOptions: {
                parser: '@typescript-eslint/parser'
            }
        }
    ],
    plugins: ['@typescript-eslint', 'svelte'],
    parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2020,
        extraFileExtensions: ['.svelte']
    },
    env: {
        browser: true,
        es2017: true,
        node: false
    }
};
