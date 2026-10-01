import fs from 'fs';
const page = fs.readFileSync('src/lib/components/revise/ReviseModal.svelte', 'utf-8');
console.log(page.includes('export let open'));
