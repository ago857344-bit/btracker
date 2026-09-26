import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	clearScreen: false,
	server: { port: 1420, strictPort: true },
	envPrefix: ['VITE_', 'TAURI_', 'PUBLIC_'],
	build: { target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13' }
});
