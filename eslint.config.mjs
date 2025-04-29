import tseslint from '@electron-toolkit/eslint-config-ts';
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier';
import eslintPluginSvelte from 'eslint-plugin-svelte';

export default tseslint.config(
  { ignores: ['**/node_modules', '**/dist', '**/out', './archive'] },
  tseslint.configs.recommended,
  eslintPluginSvelte.configs['flat/recommended'],
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    files: ['**/*.{tsx,svelte,ts}'],
    rules: {
      'svelte/no-unused-svelte-ignore': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off', // TODO: re-enable
      '@typescript-eslint/no-unused-vars': ['warn'], // TODO: re-enable
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  eslintConfigPrettier,
);
