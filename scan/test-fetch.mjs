/* For test.mjs: replaces fetch with canned answers, so that scan.mjs can run end to end offline.
   FETCH_FIXTURES names a JSON file of [{ match, body, base64 }]; the first entry whose `match` occurs in the URL answers. */
import { readFileSync } from 'node:fs';

const fixtures = JSON.parse(readFileSync(process.env.FETCH_FIXTURES, 'utf8'));
globalThis.fetch = async url => {
  const f = fixtures.find(x => String(url).includes(x.match));
  if (!f) return new Response('not found', { status: 404 });
  return new Response(f.base64 ? Buffer.from(f.body, 'base64') : f.body, { status: 200 });
};
