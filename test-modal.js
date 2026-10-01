import fs from 'fs';
const page = fs.readFileSync('src/routes/revise/+page.svelte', 'utf-8');
console.log("Checking if ReviseModal has correct props in +page.svelte...");
console.log(page.includes('bind:open={reviseOpen}'));
