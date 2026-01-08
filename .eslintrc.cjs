/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
    webextensions: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  settings: {
    react: {
      version: 'detect',
      pragma: 'h',
      pragmaFrag: 'Fragment',
    },
  },
  rules: {
    // TypeScript
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',

    // React (Preact)
    'react/react-in-jsx-scope': 'off', // Not needed with Preact
    'react/prop-types': 'off', // Using TypeScript
    'react/no-unknown-property': ['error', { ignore: ['class'] }], // Preact uses class

    // General
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'no-throw-literal': 'error',

    // Security - important for extension
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
  },
  overrides: [
    // Test files
    {
      files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*.ts'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'no-console': 'off',
      },
    },
    // Config files
    {
      files: ['*.config.ts', '*.config.js', '.eslintrc.cjs'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    // Injected script runs in untrusted context
    {
      files: ['src/injected/**/*.ts'],
      rules: {
        'no-console': 'off', // Logging is useful for debugging in page context
      },
    },
  ],
  ignorePatterns: ['dist/', 'node_modules/', 'coverage/', '*.d.ts'],
};
