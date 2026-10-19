/* Rebuilds domains.js, the flat list of university domains the worker checks addresses against, from the public list at
   github.com/Hipo/university-domains-list. Run `node build-domains.mjs` from this folder now and then and commit the result;
   the worker never fetches the list itself (parsing 2 MB per request would not fit a Worker's CPU budget). */
import { writeFileSync } from 'node:fs';
const URL = 'https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json';
const r = await fetch(URL);
if (!r.ok) throw new Error(`The list could not be downloaded (${r.status}).`);
const universities = await r.json();
const domains = [...new Set(universities.flatMap(u => u.domains || []).map(d => String(d).toLowerCase().trim()).filter(d => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)))].sort();
writeFileSync(new URL('./domains.js', import.meta.url), `/* ${domains.length} university domains from github.com/Hipo/university-domains-list, built by build-domains.mjs on ${new Date().toISOString().slice(0, 10)}. Do not edit by hand; additions go in EXTRA_DOMAINS. */\nexport default ${JSON.stringify(domains)};\n`);
console.log(`domains.js: ${domains.length} domains from ${universities.length} institutions`);
