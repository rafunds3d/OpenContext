/* Checks for the preprint scan, run with `node scan/test.mjs` from the repository root. Offline: the end-to-end run at
   the bottom answers scan.mjs's requests from canned feeds (test-fetch.mjs). */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadData, buildProfiles, referenceKeys, findReference, parseAtom, unpackEprint, untar, tfidf, terms, normalize, stripTex, phraseHits, sharedPassages, screen, examine, acknowledgement, strength, renderReport } from './lib.mjs';

const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const { PROBLEMS } = loadData(read('data/problems.js'), ['PROBLEMS']);
const { SITE } = loadData(read('data/site.js'), ['SITE']);
const profile = JSON.parse(read('scan/profile.json'));
const profiles = buildProfiles(PROBLEMS, profile, SITE.started);
const P1 = profiles.find(p => p.number === 1), P3 = profiles.find(p => p.number === 3);
assert.ok(P1 && P3, 'the checks expect Problems 1 and 3 in data/problems.js');
for (const p of profiles) assert.ok(profile.problems[String(p.number)], `scan/profile.json has no phrases for Problem ${p.number}`);

/* text */
assert.equal(normalize('Non-Contextual  Wigner–positive'), 'non contextual wigner positive');
assert.equal(normalize(stripTex('the \\emph{Wigner} entropy \\(h(W)\\) % comment\nis')), 'the wigner entropy is');
assert.equal(normalize(stripTex('costs 5\\% of copies')), 'costs 5 of copies', 'an escaped % is not a comment');
assert.ok(!/\\|\(h/.test(stripTex('a \\(x\\) b \\[y\\] c $z$')));
assert.deepEqual(phraseHits('the noncontextuality inequalities hold', ['noncontextuality inequalit', 'switch']), ['noncontextuality inequalit']);
assert.deepEqual(phraseHits('a switchboard', ['switch']), ['switch'], 'phrases may end mid-word');
assert.deepEqual(phraseHits('the bswitch', ['switch']), [], 'but start at a word boundary');

/* references */
const k = referenceKeys({ text: 'Z. Van Herstraeten and N. J. Cerf, Quantum Wigner entropy, Phys. Rev. A 104, 042211 (2021)', url: 'https://doi.org/10.1103/PhysRevA.104.042211' });
assert.equal(k.title, 'quantum wigner entropy'); assert.equal(k.doi, '10.1103/physreva.104.042211'); assert.equal(k.year, '2021'); assert.equal(k.surname, 'herstraeten');
const k2 = referenceKeys({ text: 'Z. He, Wigner entropy below vacuum: physical counterexamples and stability limits (2026)', url: 'https://arxiv.org/abs/2609.13312' });
assert.equal(k2.arxiv, '2609.13312'); assert.equal(k2.title, 'wigner entropy below vacuum: physical counterexamples and stability', 'the opening eight words');
assert.equal(findReference(k2, '', 'see arXiv:2609.13312'), 'arXiv number');
assert.equal(findReference(k, normalize('Z. Van Herstraeten, N. Cerf, Phys. Rev. A (2021)'), ''), 'author and year');
for (const p of profiles) for (const r of p.references) assert.ok(r.title || r.arxiv || r.doi, `no way to recognise reference "${r.text}"`);

/* feeds */
const entry = (id, title, summary, extra = '') => `<entry><id>http://arxiv.org/abs/${id}</id><published>2026-10-21T10:00:00Z</published><updated>2026-10-21T10:00:00Z</updated><title>${title}</title><summary>${summary}</summary><author><name>A. Author</name></author><author><name>B. Author</name></author><link href="http://arxiv.org/abs/${id}" rel="alternate" type="text/html"/><link title="pdf" href="http://arxiv.org/pdf/${id}" rel="related" type="application/pdf"/><arxiv:primary_category term="quant-ph"/><category term="quant-ph" scheme="http://arxiv.org/schemas/atom"/>${extra}</entry>`;
const feed = (...entries) => `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><opensearch:totalResults xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">${entries.length}</opensearch:totalResults>${entries.join('')}</feed>`;
const parsed = parseAtom(feed(entry('2610.11111v1', 'A &amp; B', 'x &lt; y', '<arxiv:comment>12 pages</arxiv:comment>')), 'arxiv');
assert.equal(parsed.total, 1);
assert.deepEqual([parsed.entries[0].id, parsed.entries[0].base, parsed.entries[0].title, parsed.entries[0].summary, parsed.entries[0].comment], ['2610.11111v1', '2610.11111', 'A & B', 'x < y', '12 pages']);
assert.deepEqual(parsed.entries[0].authors, ['A. Author', 'B. Author']);
const hex = parseAtom('<feed><entry><title>Pauli problem in dimension 4</title><id>https://hexagonmath.org/abs/2609.00126v1</id><published>2026-09-29T02:07:25.000Z</published><summary>s</summary><author><name>D. G.</name><arxiv:affiliation>QuSoft</arxiv:affiliation></author><link href="https://hexagonmath.org/abs/2609.00126v1" rel="alternate" type="text/html" /><category term="quant-ph" scheme="http://arxiv.org/schemas/atom" /></entry></feed>', 'hexagon');
assert.equal(hex.entries[0].id, '2609.00126v1'); assert.equal(hex.entries[0].url, 'https://hexagonmath.org/abs/2609.00126v1'); assert.deepEqual(hex.entries[0].authors, ['D. G.']);
assert.equal(parseAtom('<feed><entry><id>http://arxiv.org/api/errors</id><title>Error</title><summary>bad</summary></entry></feed>', 'arxiv').entries.length, 0);

/* sources */
function tar(files) {
  const blocks = [];
  for (const [name, text] of Object.entries(files)) {
    const data = Buffer.from(text), h = Buffer.alloc(512);
    h.write(name, 0); h.write('0000644\0', 100); h.write(data.length.toString(8).padStart(11, '0') + '\0', 124); h.write('0', 156); h.write('ustar\0', 257); h.write('00', 263);
    h.write('        ', 148); let sum = 0; for (const x of h) sum += x; h.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
    blocks.push(h, data, Buffer.alloc((512 - data.length % 512) % 512));
  }
  return Buffer.concat([...blocks, Buffer.alloc(1024)]);
}
assert.deepEqual(untar(tar({ 'a.tex': 'hello', 'dir/b.bbl': 'x'.repeat(700) })).map(f => [f.name, f.data.length]), [['a.tex', 5], ['dir/b.bbl', 700]]);
const up = unpackEprint(gzipSync(tar({ 'main.tex': '\\documentclass{article} hi', 'fig.png': 'PNG', 'refs.bbl': 'bib' })));
assert.equal(up.kind, 'tex'); assert.deepEqual(up.files.map(f => f.name), ['main.tex', 'refs.bbl']);
assert.equal(unpackEprint(gzipSync(Buffer.from('\\documentclass{revtex4} body'))).files[0].text, '\\documentclass{revtex4} body');
assert.equal(unpackEprint(Buffer.from('%PDF-1.5 ...')).kind, 'pdf');

/* scoring: a fortnight of ordinary quant-ph abstracts as background */
const background = [
  'We demonstrate high-fidelity readout of superconducting transmon qubits using a parametric amplifier.',
  'We study the Wigner entropy of mixtures of Fock states and compute it numerically for several examples.',
  'A variational quantum eigensolver for molecular ground states on noisy hardware.',
  'We propose a protocol for quantum key distribution over metropolitan fibre networks.',
  'The quantum SWITCH enhances communication through noisy channels, which we verify in a photonic experiment.',
  'Bell nonlocality in multipartite networks and the triangle scenario.',
  'Entanglement certification of photonic states with calibrated measurements and finite statistics.',
  'Error mitigation for quantum chemistry simulations with zero-noise extrapolation.'
].map((s, i) => ({ source: 'arxiv', id: `2610.0000${i}v1`, base: `2610.0000${i}`, title: s.split(' ').slice(0, 6).join(' '), summary: s, authors: ['X'], categories: ['quant-ph'], published: '2026-10-21' }));
const onTarget = { source: 'arxiv', id: '2610.22222v1', base: '2610.22222', title: 'The Wigner entropy bound as a noncontextuality inequality', summary: 'We show that the lower bound on the Wigner entropy of Wigner-positive states is a generalized noncontextuality inequality for a prepare-and-measure scenario with quadrature measurements, and we bound the infimum.', authors: ['Y'], categories: ['quant-ph'], published: '2026-10-22' };
const corpus = [...background, onTarget];
const vectorOf = tfidf([...corpus.map(p => terms(normalize(p.title + ' . ' + stripTex(p.summary)))), ...profiles.map(p => p.terms)]);
for (const pr of profiles) pr.vector = vectorOf(pr.terms);
const flaggedFor = p => screen(p, profiles, vectorOf, profile.similarityThreshold).map(m => m.problem);
assert.deepEqual(flaggedFor(onTarget), [1], 'subject and question of Problem I together');
assert.deepEqual(flaggedFor(background[1]), [], 'the Wigner entropy alone is ordinary science');
assert.deepEqual(flaggedFor(background[4]), [], 'the quantum SWITCH alone is ordinary science');
assert.deepEqual(flaggedFor(background[6]), [], 'entanglement certification with calibrated devices alone');
for (const p of background) assert.deepEqual(flaggedFor(p), [], `background abstract flagged: ${p.summary}`);

/* full text */
const copied = 'For a bosonic mode with quadratures x and p, a state rho has a Wigner quasiprobability representation on phase space which, unlike a probability distribution, may take negative values.';
const src = [{ name: 'main.tex', text: `\\documentclass{revtex4}\\begin{document} ${copied} We use quadrature measurements. \\end{document}` }, { name: 'main.bbl', text: '\\bibitem{he} Z. He, arXiv:2609.13312 (2026). \\bibitem{vh} Z. Van Herstraeten and N. J. Cerf, Phys. Rev. A 104, 042211 (2021).' }];
const deep = examine(src, P1);
assert.equal(deep.passages.length, 1); assert.ok(deep.passages[0].includes('wigner quasiprobability representation on phase space which unlike a probability distribution'), deep.passages[0]);
assert.deepEqual(deep.sharedReferences.map(r => r.how).sort(), ['arXiv number', 'author and year']);
assert.deepEqual(sharedPassages('a b c d e f g h i j', 'x a b c d e f g h i y', 8), ['a b c d e f g h i']);
assert.deepEqual(sharedPassages('a b c d e f g h', 'a b c d e f g', 8), []);
const m = screen(onTarget, [P1], vectorOf, profile.similarityThreshold)[0];
assert.equal(strength({ ...m, deep: { ...deep, passages: [] , referenceShare: 0.1 } }), 'moderate');
assert.equal(strength({ ...m, deep: { ...deep, passages: [copied, copied] } }), 'strong');
assert.equal(strength({ topic: ['wigner entropy'], angle: [], similarity: 0.3 }), 'weak');

/* acknowledgement */
const acks = profile.acknowledgements;
assert.equal(acknowledgement(normalize('as posed in the OpenContext database [12]'), '', acks), 'opencontext');
assert.equal(acknowledgement('', 'https://rafunds3d.github.io/OpenContext/#/problem/1', acks), 'opencontext');
assert.equal(acknowledgement(normalize(SITE.paper.title), SITE.paper.title, acks), 'skilled humans collaborating with ai agents');
assert.equal(acknowledgement(normalize('an open context for experiments'), 'an open context for experiments', acks), null);

/* report */
const report = renderReport({ date: '2026-10-23', window: { from: '2026-10-18', to: '2026-10-23' }, counts: { arxiv: 9, hexagon: 0, fresh: 9, flagged: 1, fullText: 1 }, candidates: [{ ...m, paper: onTarget, deep, strength: 'moderate' }], acknowledged: [], problemsById: { 1: P1 }, errors: [] });
assert.ok(report.includes('## [moderate] The Wigner entropy bound as a noncontextuality inequality'));
assert.ok(report.includes('not findings'));
assert.ok(report.includes('References shared with the entry: 2 of'));

/* end to end, offline */
const dir = mkdtempSync(join(tmpdir(), 'scan-'));
try {
  const cited = { ...onTarget, id: '2610.33333v1', base: '2610.33333', title: 'Wigner entropy and noncontextuality, revisited' };
  const fixtures = [
    { match: 'e-print/2610.22222', body: gzipSync(tar({ 'main.tex': src[0].text, 'main.bbl': src[1].text })).toString('base64'), base64: true },
    { match: 'e-print/2610.33333', body: gzipSync(Buffer.from('\\documentclass{article} We thank the OpenContext database for posing this problem.')).toString('base64'), base64: true },
    { match: 'export.arxiv.org/api/query', body: feed(...[...background, onTarget, cited].map(p => entry(p.id, p.title, p.summary))) },
    { match: 'hexagonmath.org/api/query', body: feed() }
  ];
  writeFileSync(join(dir, 'fixtures.json'), JSON.stringify(fixtures));
  const run = () => execFileSync(process.execPath, ['--import', new URL('./test-fetch.mjs', import.meta.url).pathname, new URL('./scan.mjs', import.meta.url).pathname, '--out', join(dir, 'out'), '--state', join(dir, 'seen.json')], { env: { ...process.env, FETCH_FIXTURES: join(dir, 'fixtures.json'), SCAN_ARXIV_GAP_MS: '0', GITHUB_OUTPUT: '' }, encoding: 'utf8' });
  const log = run();
  assert.match(log, /scanned 10 preprints \(10 new\), flagged 2, full text 2, candidates 1 \(1 strong\), acknowledging 1/);
  assert.ok(!log.includes(onTarget.title), 'titles stay out of the log unless --verbose');
  const out = JSON.parse(readFileSync(join(dir, 'out/candidates.json'), 'utf8'));
  assert.deepEqual(out.candidates.map(c => [c.paper.id, c.problem, c.deep.passages.length]), [['2610.22222v1', 1, 1]]);
  assert.deepEqual(out.acknowledged.map(a => a.paper.id), ['2610.33333v1']);
  assert.match(readFileSync(join(dir, 'out/report.md'), 'utf8'), /Preprints that acknowledge OpenContext/);
  assert.match(run(), /scanned 10 preprints \(0 new\), flagged 0/, 'a second run skips what the first one saw');
} finally { rmSync(dir, { recursive: true, force: true }); }

console.log('scan: all checks passed');
