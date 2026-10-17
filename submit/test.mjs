/* Checks for the pure helpers of worker.js, run with `node test.mjs` (or `npm test`) from this folder. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validate, buildEntry, serializeEntry, insertBeforeMarker, nextProblemNumber, uniqueSlug, markUnderRevision, markStatus, quickDomainCheck, isInstitutional, matchesDomain, sanitizeMarkup, structural, TYPES } from './worker.js';

const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const problems = read('data/problems.js'), contributions = read('data/contributions.js'), posts = read('data/posts.js'), goals = read('data/goals.js');
/* load a data file the way the browser does: tex`…` is String.raw */
const load = src => new Function('tex', src + '\nreturn { PROBLEMS: typeof PROBLEMS !== "undefined" ? PROBLEMS : null, CONTRIBUTIONS: typeof CONTRIBUTIONS !== "undefined" ? CONTRIBUTIONS : null, POSTS: typeof POSTS !== "undefined" ? POSTS : null, FUTURE_GOALS: typeof FUTURE_GOALS !== "undefined" ? FUTURE_GOALS : null };')(String.raw);
const before = load(problems).PROBLEMS;
const firstOpen = before.find(p => p.status === 'open');
assert.ok(firstOpen, 'the checks need one open problem in data/problems.js');

/* domains */
assert.equal(quickDomainCheck('gmail.com'), false);
assert.equal(quickDomainCheck('mit.edu'), true);
assert.equal(quickDomainCheck('physics.ox.ac.uk'), true);
assert.equal(quickDomainCheck('unicamp.edu.br'), true);
assert.equal(quickDomainCheck('uni-ulm.de'), null);
assert.equal(quickDomainCheck('mallory.edu.xyz'), null, 'edu under an open TLD is not an academic suffix');
assert.equal(quickDomainCheck('evil.ac.io'), null);
assert.equal(quickDomainCheck('perimeterinstitute.ca', ['perimeterinstitute.ca']), true);
assert.equal(quickDomainCheck('not a domain'), false);
assert.equal(matchesDomain('mail.uni-ulm.de', ['uni-ulm.de']), true);
assert.equal(matchesDomain('notuni-ulm.de', ['uni-ulm.de']), false);
assert.equal(isInstitutional('uni-ulm.de'), true, 'in the bundled university list');
assert.equal(isInstitutional('mail.uni-ulm.de'), true);
assert.equal(isInstitutional('example.com'), false);
assert.equal(isInstitutional('mallory.edu.xyz'), false);

/* a submitted problem round-trips through data/problems.js */
const sub = validate({ type: 'problem', email: 'Ada@Phys.Uni-Ulm.de ', by: ['Ada Lovelace (Ulm)', ''], ai: 'partial', consent: true,
  fields: { title: 'A test `problem`', goals: 'classicality, framework', topics: 'Test', statement: 'Is \\(x\\) equal to \\[y\\]?\n\nSecond paragraph with ${braces} and a trailing backslash \\', background: 'B', relevance: 'R', significance: 'S', references: 'A. Author, Title (2026) | https://arxiv.org/abs/0000.00000\nB. Author, Other (2025)\nC. Author, Bad link (2024) | javascript:alert(1)' } });
assert.equal(sub.email, 'ada@phys.uni-ulm.de');
assert.deepEqual(sub.by, ['Ada Lovelace (Ulm)']);
const n = nextProblemNumber(problems);
assert.equal(n, Math.max(...before.map(p => p.number)) + 1);
const entry = buildEntry(sub, { date: '2026-10-17', number: n });
const withProblem = insertBeforeMarker(problems, TYPES.problem.marker, '  ' + serializeEntry(entry) + ',\n');
const { PROBLEMS } = load(withProblem);
assert.equal(PROBLEMS.length, before.length + 1);
const added = PROBLEMS.at(-1);
assert.equal(added.number, n);
assert.equal(added.title, 'A test `problem`');
assert.deepEqual(added.goals, ['classicality', 'framework']);
assert.equal(added.statement, 'Is \\(x\\) equal to \\[y\\]?\n\nSecond paragraph with $ {braces} and a trailing backslash');
assert.deepEqual(added.references, [{ text: 'A. Author, Title (2026)', url: 'https://arxiv.org/abs/0000.00000' }, { text: 'B. Author, Other (2025)', url: '' }, { text: 'C. Author, Bad link (2024)', url: '' }]);
assert.deepEqual(added.history, [{ date: '2026-10-17', kind: 'posed', text: 'Problem posed through the site.', by: ['Ada Lovelace (Ulm)'] }]);
assert.equal(nextProblemNumber(withProblem), n + 1);

/* a contribution, a post and a direction land in their files */
const c = validate({ type: 'contribution', email: 'a@b.edu', by: ['A'], ai: 'none', consent: true, fields: { problem: String(firstOpen.number), kind: 'claim', title: 'A claim', material: 'manuscript', summary: 'We show \\(1=1\\).', url: 'https://arxiv.org/abs/1', provisional: true } });
const withContribution = insertBeforeMarker(contributions, TYPES.contribution.marker, '  ' + serializeEntry(buildEntry(c, { date: '2026-10-17' })) + ',\n');
assert.deepEqual(load(withContribution).CONTRIBUTIONS.at(-1), { problem: firstOpen.number, date: '2026-10-17', kind: 'claim', title: 'A claim', material: 'manuscript', ai: 'none', by: ['A'], provisional: true, summary: 'We show \\(1=1\\).', url: 'https://arxiv.org/abs/1' });
const p = validate({ type: 'post', email: 'a@b.edu', by: ['A'], ai: 'full', consent: true, fields: { title: 'Ünïcode title!', summary: 'S', body: 'Body.', problems: '1, x, 3', challengeTo: 'framework' } });
const slugged = uniqueSlug('unicode-title', posts);
const withPost = insertBeforeMarker(posts, TYPES.post.marker, '  ' + serializeEntry(buildEntry(p, { date: '2026-10-17', slug: slugged })) + ',\n');
const post = load(withPost).POSTS.at(-1);
assert.equal(post.slug, 'unicode-title');
assert.deepEqual(post.problems, [1, 3]);
assert.equal(uniqueSlug('unicode-title', withPost), 'unicode-title-2');
const d = validate({ type: 'direction', email: 'a@b.edu', by: ['A'], ai: 'none', consent: true, fields: { title: 'A direction', summary: 'One line.', description: 'Why.\n\nAnd how.' } });
const withDirection = insertBeforeMarker(goals, TYPES.direction.marker, '  ' + serializeEntry(buildEntry(d, { date: '2026-10-17' })) + ',\n');
const dir = load(withDirection).FUTURE_GOALS.at(-1);
assert.equal(dir.title, 'A direction');
assert.deepEqual(dir.proposedBy, ['A']);
assert.equal(dir.description, 'Why.\n\nAnd how.');

/* a claim places an open problem under revision, once; moderators can set any status */
const revised = markUnderRevision(problems, firstOpen.number, '2026-10-17');
const P = load(revised).PROBLEMS, pr = P.find(x => x.number === firstOpen.number);
assert.equal(pr.status, 'under-revision');
assert.deepEqual(pr.history.at(-1), { date: '2026-10-17', kind: 'status', to: 'under-revision', text: 'A solution has been claimed; the problem is placed under revision.', by: [] });
assert.equal(pr.history.length, firstOpen.history.length + 1);
assert.deepEqual(pr.references, firstOpen.references);
for (const q of P) if (q.number !== firstOpen.number) assert.equal(q.status, before.find(x => x.number === q.number).status);
assert.equal(markUnderRevision(revised, firstOpen.number, '2026-10-18'), revised, 'a second claim changes nothing');
assert.equal(markUnderRevision(problems, 99, '2026-10-18'), problems);
const solved = markStatus(revised, firstOpen.number, 'solved', '2026-11-01', 'Verified by three researchers.', { by: ['X', 'Y'] });
const ps = load(solved).PROBLEMS.find(x => x.number === firstOpen.number);
assert.equal(ps.status, 'solved');
assert.deepEqual(ps.history.at(-1), { date: '2026-11-01', kind: 'status', to: 'solved', text: 'Verified by three researchers.', by: ['X', 'Y'] });
assert.equal(markStatus(solved, firstOpen.number, 'under-revision', '2026-11-02', 'x', { from: 'open' }), solved, 'opts.from is respected');
/* one-line and missing history arrays */
const tiny = (hist) => `const PROBLEMS = [\n  {\n    number: 7,\n    title: "T",\n    status: "open",${hist}\n    references: [{ text: "A", url: "" }]\n  },\n];\n/* new problems are added above this line */\n`;
for (const [hist, len] of [['\n    history: [],', 1], ['\n    history: [{ date: "2026-10-01", kind: "posed", text: "P.", by: [] }],', 2], ['', 1]]) {
  const out = markStatus(tiny(hist), 7, 'under-revision', '2026-10-17', 'Claimed.');
  const q = load(out).PROBLEMS[0];
  assert.equal(q.status, 'under-revision', hist);
  assert.equal(q.history.length, len, hist);
  assert.equal(q.history.at(-1).to, 'under-revision');
  assert.deepEqual(q.references, [{ text: 'A', url: '' }], hist);
}

/* text inside entries cannot pose as structure: markers, numbers and slugs in submitted text are ignored */
const marker = TYPES.problem.marker;
const evil = validate({ ...sub, consent: true, fields: { ...sub.fields, title: 'Evil', background: `Look:\n${marker}\n  {\n    number: 999999,\n    status: "open",\n    history: [\n    ]\n  },` } });
const withEvil = insertBeforeMarker(problems, marker, '  ' + serializeEntry(buildEntry(evil, { date: '2026-10-17', number: n })) + ',\n');
assert.equal(nextProblemNumber(withEvil), n + 1, 'a number inside a text is not an entry');
const afterEvil = insertBeforeMarker(withEvil, marker, '  ' + serializeEntry(buildEntry(sub, { date: '2026-10-18', number: n + 1 })) + ',\n');
const E = load(afterEvil).PROBLEMS;
assert.equal(E.length, before.length + 2);
assert.equal(E.at(-1).number, n + 1);
assert.ok(E.at(-2).background.includes(marker));
assert.equal(load(markUnderRevision(afterEvil, n, '2026-10-19')).PROBLEMS.at(-2).status, 'under-revision');
assert.equal(structural('a: "x\\"y", b: `q${marker}`, c: 1 // "d"').length, 'a: "x\\"y", b: `q${marker}`, c: 1 // "d"'.length, 'blanking keeps positions');
assert.ok(!structural(`x: tex\`${marker}\``).includes('new problems'));
const bodySlug = validate({ ...p, consent: true, fields: { ...p.fields, body: 'slug: "unicode-title-2"' } });
assert.equal(uniqueSlug('unicode-title', insertBeforeMarker(withPost, TYPES.post.marker, '  ' + serializeEntry(buildEntry(bodySlug, { date: '2026-10-17', slug: 'other' })) + ',\n')), 'unicode-title-2');

/* markup in text fields: a few tags pass, everything else is shown literally, links must be http(s) */
assert.equal(sanitizeMarkup('a <em>b</em> <strong>c</strong> <code>d</code> x<sup>2</sup> H<sub>2</sub>O<br>'), 'a <em>b</em> <strong>c</strong> <code>d</code> x<sup>2</sup> H<sub>2</sub>O<br>');
assert.equal(sanitizeMarkup('<a href="https://arxiv.org/abs/1">p</a>'), '<a href="https://arxiv.org/abs/1" rel="noopener">p</a>');
assert.equal(sanitizeMarkup('<a href="javascript:alert(1)">p</a>'), '&lt;a href="javascript:alert(1)">p</a>');
assert.equal(sanitizeMarkup('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)>');
assert.equal(sanitizeMarkup('<script>x</script>'), '&lt;script>x&lt;/script>');
assert.equal(sanitizeMarkup('<em onclick="x">y</em>'), '&lt;em onclick="x">y</em>');
assert.equal(sanitizeMarkup('\\(a<b\\) and c > d and \\(x <y\\)'), '\\(a&lt;b\\) and c > d and \\(x &lt;y\\)');
assert.equal(sanitizeMarkup('<!-- c --> <?x <'), '&lt;!-- c --> &lt;?x <');
assert.equal(buildEntry(c, { date: '2026-10-17' }).summary, 'We show \\(1=1\\).');
assert.equal(buildEntry(validate({ ...c, consent: true, fields: { ...c.fields, summary: '<b>ok</b><script>no</script>' } }), { date: '2026-10-17' }).summary, '<b>ok</b>&lt;script>no&lt;/script>');

/* single-line fields are flattened; over-long input is refused, not cut; cleaning stays fast on hostile input */
const flat = validate({ ...c, consent: true, by: ['Closes #1\n\n# Heading', ' A  B '], fields: { ...c.fields, title: 'Line\n\nbreak' } });
assert.deepEqual(flat.by, ['Closes #1 # Heading', 'A B']);
assert.equal(flat.fields.title, 'Line break');
assert.throws(() => validate({ ...c, consent: true, fields: { ...c.fields, title: 'x'.repeat(301) } }), /too long/);
assert.throws(() => validate({ ...sub, consent: true, fields: { ...sub.fields, statement: 'x'.repeat(20001) } }), /too long/);
const t0 = performance.now();
validate({ ...sub, consent: true, fields: { ...sub.fields, statement: (' '.repeat(19990) + 'x'), background: ('a ' + ' '.repeat(5000) + '\n').repeat(3) } });
assert.ok(performance.now() - t0 < 200, 'cleaning is linear');

/* validation refuses what it should */
const base = { type: 'contribution', email: 'a@b.edu', by: ['A'], ai: 'none', consent: true, fields: { problem: '2', kind: 'comment', title: 't', material: 'm', summary: 's' } };
for (const bad of [
  { ...base, email: 'nope' }, { ...base, email: 'a b@c.edu' }, { ...base, by: [] }, { ...base, ai: 'maybe' }, { ...base, ai: '__proto__' }, { ...base, consent: false }, { ...base, website: 'spam' }, { ...base, type: 'other' }, { ...base, type: 'constructor' },
  { ...base, fields: { ...base.fields, problem: 'x' } }, { ...base, fields: { ...base.fields, kind: 'guess' } }, { ...base, fields: { ...base.fields, kind: 'toString' } }, { ...base, fields: { ...base.fields, url: 'ftp://x' } }, { ...base, fields: { ...base.fields, url: 'https://x y' } }, { ...base, fields: { ...base.fields, summary: '' } },
  { ...sub, consent: true, fields: { ...sub.fields, goals: '' } }, { ...p, consent: true, fields: { ...p.fields, challengeTo: 'Not A Goal' } }, null, 'string'
]) assert.throws(() => validate(bad), `should refuse ${JSON.stringify(bad).slice(0, 60)}`);

/* the site's own copy of the entry format (js/lib.js) produces the same text as the service */
const site = read('data/site.js');
const lib = new Function('tex', 'document', 'location', site + '\n' + goals + '\n' + problems + '\n' + contributions + '\n' + posts + '\n' + read('js/lib.js') + '\nreturn { buildEntry, serializeEntry, sanitizeMarkup };')(String.raw, {}, { href: 'http://x/' });
for (const [s, extra] of [[sub, { date: '2026-10-17', number: n }], [evil, { date: '2026-10-17', number: n }], [c, { date: '2026-10-17' }], [p, { date: '2026-10-17', slug: 'unicode-title' }], [d, { date: '2026-10-17' }]]) {
  const mine = serializeEntry(buildEntry(s, extra));
  const theirs = lib.serializeEntry(lib.buildEntry(s.type, s.fields, { by: s.by, ai: s.ai, date: extra.date, number: extra.number, slug: extra.slug }));
  assert.equal(theirs, mine, `js/lib.js and worker.js agree on a ${s.type}`);
}
assert.equal(lib.sanitizeMarkup('<img src=x> <em>y</em>'), sanitizeMarkup('<img src=x> <em>y</em>'));

console.log('submit/worker.js: all checks passed');
