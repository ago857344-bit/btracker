/// <reference types="vite/client" />

// Vite exposes envPrefix (VITE_, TAURI_, PUBLIC_ — see vite.config.ts) vars from .env.
interface ImportMetaEnv {
	readonly VITE_GOOGLE_CLIENT_ID?: string;
	readonly PUBLIC_SUPABASE_URL?: string;
	readonly PUBLIC_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
