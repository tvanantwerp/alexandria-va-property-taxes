import eslint from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Ensure CommonJS require() is an error - THE KEY RULE TO PREVENT THE BUG
      // (keeping this explicit even if included in strict to make it clear)
      '@typescript-eslint/no-require-imports': 'error',

      // Allow unused vars that start with underscore (common pattern for ignored args)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  // Prettier configuration
  {
    files: ['**/*.{js,ts}'],
    plugins: {
      prettier,
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      '*.config.js',
      '**/*.test.ts',
      '**/*.test.tsx',
    ],
  },
);
