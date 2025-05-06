import type { Config } from 'tailwindcss';

export default {
  content: ['src/renderer/index.html', 'src/**/*.{html,svelte,js,ts,}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
