import tseslint from '@electron-toolkit/eslint-config-ts';
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier';
import eslintPluginSvelte from 'eslint-plugin-svelte';

export default tseslint.config(
  { ignores: ['**/node_modules', '**/dist', '**/out', './archive'] },
  tseslint.configs.recommended,
  eslintPluginSvelte.configs['flat/recommended'],
  {
    files: ['**/*.{tsx,svelte,ts}'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    files: ['**/*.{tsx,svelte,ts}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
          selector: 'variable',
        },
        {
          format: ['camelCase', 'PascalCase'],
          selector: 'function',
        },
        {
          format: ['camelCase'],
          selector: ['objectLiteralProperty', 'typeProperty'],
        },
        {
          format: ['PascalCase'],
          selector: ['enum', 'enumMember', 'class', 'interface', 'typeAlias'],
        },
        {
          format: ['camelCase'],
          leadingUnderscore: 'require',
          modifiers: ['unused'],
          selector: 'parameter',
        },
      ],
    },
  },
  eslintConfigPrettier,
);
