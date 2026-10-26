import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	clearScreen: false,
	server: {
		port: 1420,
		strictPort: false,
		watch: {
			ignored: ['**/.vercel/**', '**/.svelte-kit/**', '**/build-desktop/**']
		}
	},
	envPrefix: ['VITE_', 'TAURI_', 'PUBLIC_'],
	build: {
		target: process.env.TAURI_ENV_PLATFORM
			? (process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13')
			: ['es2022', 'safari16'],
		cssCodeSplit: true,
		chunkSizeWarningLimit: 800,
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('node_modules/katex') || id.includes('node_modules/marked')) {
						return 'vendor-math';
					}
					if (id.includes('node_modules/@supabase')) {
						return 'vendor-supabase';
					}
				}
			}
		}
	}
});
