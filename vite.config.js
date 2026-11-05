import { defineConfig } from 'vite';

// GitHub Pages serves this site from https://notabit5225.github.io/study-tracker/
// so every built file path needs the "/study-tracker/" prefix.
export default defineConfig({
  base: '/study-tracker/',
});
