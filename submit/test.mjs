/* Checks for the pure helpers of worker.js, run with `node test.mjs` (or `npm test`) from this folder. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker, { validate, buildEntry, serializeEntry, insertBeforeMarker, nextProblemNumber, uniqueSlug, markUnderRevision, markStatus, quickDomainCheck, isInstitutional, matchesDomain, sanitizeMarkup, structural, TYPES, LISTS, entrySpans, entryAt, fieldLiteral, removeEntry, validateEntry, parseModerators } from './worker.js';

const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const problems = read('data/problems.js'), contributions = read('data/contributions.js'), posts = read('data/posts.js'), goals = read('data/goals.js');
/* load a data file the way the browser does: tex`…` is String.raw */
const load = src => new Function('tex', src + '\nreturn { PROBLEMS: typeof PROBLEMS !== "undefined" ? PROBLEMS : null, CONTRIBUTIONS: typeof CONTRIBUTIONS !== "undefined" ? CONTRIBUTIONS : null, POSTS: typeof POSTS !== "undefined" ? POSTS : null, FUTURE_GOALS: typeof FUTURE_GOALS !== "undefined" ? FUTURE_GOALS : null, GOALS: typeof GOALS !== "undefined" ? GOALS : null };')(String.raw);
const evalEntry = text => new Function('tex', 'return (' + text + ');')(String.raw);
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


/* ===== moderation: locating, replacing, removing and adding entries ===== */
const files = { 'data/problems.js': problems, 'data/contributions.js': contributions, 'data/posts.js': posts, 'data/goals.js': goals };
for (const [name, path] of Object.entries(LISTS)) {
  const src = files[path], arr = load(src)[name];
  const spans = entrySpans(structural(src, true), name);
  assert.equal(spans.length, arr.length, `${name}: one span per entry`);
  for (let i = 0; i < arr.length; i++) {
    const f = entryAt(src, name, i);
    assert.deepEqual(evalEntry(f.text), arr[i], `${name}[${i}] reads back`);
    assert.equal(f.indent, '  ');
    /* replacing an entry with its own serialization changes nothing that the site can see */
    const replaced = src.slice(0, f.start) + serializeEntry(arr[i], f.indent) + src.slice(f.end);
    assert.deepEqual(load(replaced)[name], arr, `${name}[${i}] round-trips through serializeEntry`);
    assert.deepEqual(load(replaced)[name === 'GOALS' ? 'FUTURE_GOALS' : name === 'FUTURE_GOALS' ? 'GOALS' : name], load(src)[name === 'GOALS' ? 'FUTURE_GOALS' : name === 'FUTURE_GOALS' ? 'GOALS' : name]);
    /* removing it leaves the others, in order */
    const without = load(removeEntry(src, f))[name];
    assert.deepEqual(without, arr.filter((x, j) => j !== i), `${name}[${i}] removed`);
    assert.equal(entrySpans(structural(removeEntry(src, f), true), name).length, arr.length - 1);
  }
  assert.equal(entryAt(src, name, arr.length), null, `${name}: no entry past the end`);
}
assert.equal(entrySpans(structural(withEvil, true), 'PROBLEMS').length, before.length + 1, 'an entry-shaped text inside an entry is not an entry');
assert.deepEqual(evalEntry(entryAt(withEvil, 'PROBLEMS', before.length).text).title, 'Evil');
const f0 = entryAt(problems, 'PROBLEMS', 0);
assert.equal(fieldLiteral(problems, f0, 'number'), before[0].number);
assert.equal(fieldLiteral(problems, f0, 'title'), before[0].title);
assert.equal(fieldLiteral(problems, f0, 'status'), before[0].status);
assert.equal(fieldLiteral(problems, f0, 'nonesuch'), undefined);
assert.equal(fieldLiteral(problems, f0, 'text'), undefined, 'a nested field is not a top-level one');
const texTitle = '  {\n    number: 9,\n    title: tex`A \\(b\\) title`,\n    status: "open",\n    history: [{ date: "2026-01-01", kind: "posed", text: "x", by: [] }]\n  },\n';
const withTex = insertBeforeMarker(problems, TYPES.problem.marker, texTitle);
assert.equal(fieldLiteral(withTex, entryAt(withTex, 'PROBLEMS', before.length), 'title'), 'A \\(b\\) title');
assert.equal(fieldLiteral(withTex, entryAt(withTex, 'PROBLEMS', before.length), 'number'), 9);
/* a one-entry list and an entry without a trailing comma */
const one = 'const POSTS = [\n  {\n    slug: "a",\n    title: "A"\n  }\n];\n';
assert.deepEqual(load(removeEntry(one, entryAt(one, 'POSTS', 0))).POSTS, []);
assert.equal(entryAt(one, 'POSTS', 0).text, '{\n    slug: "a",\n    title: "A"\n  }');

/* what a moderator may send */
const okEntry = validateEntry({ number: 3, title: ' T ', status: 'open', goals: ['x'], history: [{ date: '2026-01-01', kind: 'note', text: 'a\r\nb', by: [] }], provisional: false, notice: null }, 'PROBLEMS');
assert.deepEqual(okEntry, { number: 3, title: 'T', status: 'open', goals: ['x'], history: [{ date: '2026-01-01', kind: 'note', text: 'a\nb', by: [] }], provisional: false, notice: null });
assert.deepEqual(Object.keys(okEntry), ['number', 'title', 'status', 'goals', 'history', 'provisional', 'notice'], 'field order is kept');
for (const [bad, list] of [
  [{ title: 'T', 'a b': 1 }, 'POSTS'], [{ title: 'T', 'x; alert(1); y': 1 }, 'POSTS'], [{ title: 'T', constructor: 1 }, 'POSTS'], [{ title: 'T', f: () => 1 }, 'POSTS'],
  [{ title: 'T', deep: [[[[[1]]]]] }, 'POSTS'], [{ title: '' }, 'POSTS'], [{ title: 'T' }, 'PROBLEMS'], [{ title: 'T', number: -1 }, 'PROBLEMS'], [{ title: 'T', problem: 'x' }, 'CONTRIBUTIONS'],
  [{ title: 'T', slug: 'Not Valid' }, 'POSTS'], [{ title: 'T', id: 'Bad Id' }, 'GOALS'], [{ title: 'T', n: Infinity }, 'POSTS'], [{ title: 'T', body: 'x'.repeat(50001) }, 'POSTS'], [[], 'POSTS'], ['x', 'POSTS'], [null, 'POSTS']
]) assert.throws(() => validateEntry(bad, list), `should refuse ${JSON.stringify(bad).slice(0, 50)} for ${list}`);
assert.equal(validateEntry({ title: 'New' }, 'PROBLEMS', true).title, 'New', 'a new problem has no number yet');
assert.equal(validateEntry({ title: 'New', slug: '' }, 'POSTS', true).slug, '', 'a new post may leave the slug to the service');
assert.deepEqual(parseModerators(' Ada Lovelace <Ada@Uni.edu>; "Bob" <bob@inst.org>, carol@x.org,, nope '), [{ email: 'ada@uni.edu', name: 'Ada Lovelace' }, { email: 'bob@inst.org', name: 'Bob' }, { email: 'carol@x.org', name: 'carol' }]);
/* serialized entries cannot break out of the file: identifiers as keys, strings that close nothing */
const hostile = validateEntry({ title: 'T`,\n  evil: 1, //', body: 'x${1+1}` + alert(1) + `', problems: [1], by: ['a"b', "c'd\\"] }, 'POSTS');
const withHostile = insertBeforeMarker(posts, TYPES.post.marker, '  ' + serializeEntry({ slug: 'h', ...hostile }) + ',\n');
const H = load(withHostile).POSTS.at(-1);
assert.equal(H.title, 'T’,\n  evil: 1, //');
assert.equal(H.body, 'x${1+1}` + alert(1) + `', 'a one-line text is a JSON string, where these are harmless');
const H2 = load(insertBeforeMarker(posts, TYPES.post.marker, '  ' + serializeEntry({ slug: 'h2', title: 'T', body: 'x${1+1}` + alert(1) + `\nline two' }) + ',\n')).POSTS.at(-1);
assert.equal(H2.body, 'x$ {1+1}’ + alert(1) + ’\nline two', 'in a tex text they are neutralised');
assert.deepEqual(H.by, ['a"b', "c'd"]);
assert.equal(H.evil, undefined);

/* ===== the service end to end, against a fake GitHub, a fake KV and a fake mailer ===== */
const kv = new Map();
const KV = { get: async k => kv.has(k) ? kv.get(k) : null, put: async (k, v) => { kv.set(k, v); }, delete: async k => { kv.delete(k); } };
const env = { GITHUB_REPO: 'org/repo', GITHUB_BASE: 'main', GITHUB_TOKEN: 'tok', SITE_URL: 'https://example.org/site/', SITE_NAME: 'OC', ALLOWED_ORIGIN: 'https://example.org', MAIL_PROVIDER: 'brevo', MAIL_FROM: 'OC <m@example.org>', MAIL_API_KEY: 'key', MODERATOR_EMAILS: 'Ada Lovelace <Ada@Uni.edu>; bob@inst.org', EDIT_MODE: '', SUBMISSIONS: KV };
const repo = { main: { ...files } }, branches = { main: 'sha-main-0' }, pulls = [], comments = [], mails = [], deleted = [];
let shaSeq = 1, prSeq = 0, mergedCalls = [];
const fileSha = (branch, path) => `sha-${path}-${repo[branch][path].length}-${[...repo[branch][path]].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)}`;   // content-addressed, as on GitHub
const b64 = s => Buffer.from(s, 'utf8').toString('base64');
const un64 = s => Buffer.from(s, 'base64').toString('utf8');
const ghReply = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url), m = init.method || 'GET', body = init.body ? JSON.parse(init.body) : null;
  if (u.hostname === 'api.brevo.com') { mails.push(body); return ghReply(201, { messageId: 'x' }); }
  assert.equal(u.hostname, 'api.github.com');
  assert.equal(init.headers.Authorization, 'Bearer tok');
  const p = u.pathname.replace('/repos/org/repo', '');
  let x;
  if ((x = /^\/contents\/(.+)$/.exec(p))) {
    const path = decodeURIComponent(x[1]);
    if (m === 'GET') { const ref = u.searchParams.get('ref'); if (!repo[ref] || !repo[ref][path]) return ghReply(404, { message: 'Not Found' }); return ghReply(200, { sha: fileSha(ref, path), content: b64(repo[ref][path]) }); }
    if (m === 'PUT') { const br = body.branch; if (!repo[br]) return ghReply(404, {}); if (fileSha(br, path) !== body.sha) return ghReply(409, { message: 'sha mismatch' }); repo[br][path] = un64(body.content); const sha = 'c' + shaSeq++; branches[br] = sha; return ghReply(200, { commit: { sha, html_url: `https://github.com/org/repo/commit/${sha}`, message: body.message, author: body.author } }); }
  }
  if ((x = /^\/git\/ref\/heads\/(.+)$/.exec(p)) && m === 'GET') return branches[x[1]] ? ghReply(200, { object: { sha: branches[x[1]] } }) : ghReply(404, {});
  if (p === '/git/refs' && m === 'POST') { const br = body.ref.replace('refs/heads/', ''); repo[br] = { ...repo.main }; branches[br] = body.sha; return ghReply(201, { ref: body.ref }); }
  if ((x = /^\/git\/refs\/heads\/(.+)$/.exec(p)) && m === 'DELETE') { deleted.push(x[1]); delete repo[x[1]]; delete branches[x[1]]; return ghReply(204); }
  if (p === '/pulls' && m === 'POST') { const pr = { number: ++prSeq, title: body.title, body: body.body, state: 'open', html_url: `https://github.com/org/repo/pull/${prSeq}`, user: { login: 'svc' }, created_at: '2026-10-17T10:00:00Z', updated_at: '2026-10-17T10:00:00Z', labels: [], head: { ref: body.head, repo: { full_name: 'org/repo' } }, base: { ref: body.base }, draft: false, merged: false, mergeable: true }; pulls.push(pr); return ghReply(201, pr); }
  if (p === '/pulls' && m === 'GET') return ghReply(200, pulls.filter(q => q.state === 'open'));
  if ((x = /^\/pulls\/(\d+)$/.exec(p))) { const pr = pulls.find(q => q.number === Number(x[1])); if (!pr) return ghReply(404, {}); if (m === 'PATCH') Object.assign(pr, body); return ghReply(200, pr); }
  if ((x = /^\/pulls\/(\d+)\/files$/.exec(p))) { const pr = pulls.find(q => q.number === Number(x[1])); const changed = Object.keys(repo.main).filter(k => repo[pr.head.ref] && repo[pr.head.ref][k] !== repo.main[k]); return ghReply(200, changed.map(k => ({ filename: k, status: 'modified', additions: 1, deletions: 0, patch: '@@ -1,1 +1,2 @@\n' + repo[pr.head.ref][k].split('\n').filter(l => !repo.main[k].includes(l)).map(l => '+' + l).join('\n') }))); }
  if ((x = /^\/pulls\/(\d+)\/merge$/.exec(p)) && m === 'PUT') { const pr = pulls.find(q => q.number === Number(x[1])); if (pr.title.includes('conflict')) return ghReply(405, { message: 'not mergeable' }); mergedCalls.push(body); pr.state = 'closed'; pr.merged = true; Object.assign(repo.main, repo[pr.head.ref]); return ghReply(200, { sha: 'm' + pr.number, merged: true }); }
  if ((x = /^\/issues\/(\d+)\/comments$/.exec(p)) && m === 'POST') { comments.push({ number: Number(x[1]), body: body.body }); return ghReply(201, {}); }
  if ((x = /^\/issues\/(\d+)\/labels$/.exec(p)) && m === 'POST') { pulls.find(q => q.number === Number(x[1])).labels = body.labels.map(name => ({ name })); return ghReply(200, {}); }
  throw new Error(`unexpected GitHub call ${m} ${p}`);
};
const call = async (path, body, token, origin = 'https://example.org') => {
  const r = await worker.fetch(new Request('https://svc.example' + path, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(origin ? { Origin: origin } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}), 'CF-Connecting-IP': '1.2.3.4' }, body: body ? JSON.stringify(body) : undefined }), env);
  return { status: r.status, ...(await r.json()), cors: r.headers.get('Access-Control-Allow-Headers') };
};
const origError = console.error, origLog = console.log; console.error = () => {}; console.log = () => {};
/* signing in */
assert.equal((await call('/login', { email: 'mallory@uni.edu' })).status, 403);
assert.equal((await call('/login', { email: 'ada@uni.edu' }, null, 'https://evil.example')).status, 403, 'another origin cannot ask for links');
let r = await call('/login', { email: 'ADA@uni.edu' });
assert.equal(r.status, 200);
assert.equal(mails.length, 1);
assert.equal(mails[0].to[0].email, 'ada@uni.edu');
const loginToken = /#\/moderate\?login=([\w-]+)/.exec(mails[0].textContent)[1];
assert.ok(mails[0].textContent.includes('https://example.org/site/#/moderate?login='));
assert.ok(mails[0].textContent.includes('Hello Ada Lovelace'));
assert.equal((await call('/me')).status, 401);
assert.equal((await call('/session', { login: 'nope' })).status, 400);
r = await call('/session', { login: loginToken });
assert.equal(r.status, 200);
assert.equal(r.name, 'Ada Lovelace'); assert.equal(r.email, 'ada@uni.edu'); assert.equal(r.mode, 'direct');
const tok = r.token;
assert.equal((await call('/session', { login: loginToken })).status, 400, 'a sign-in link works once');
r = await call('/me', null, tok);
assert.equal(r.status, 200); assert.equal(r.name, 'Ada Lovelace'); assert.equal(r.repo, 'org/repo');
assert.ok(r.cors.includes('Authorization'));
assert.equal((await call('/me', null, 'wrong')).status, 401);
/* two more links are fine, the fourth in an hour is not */
await call('/login', { email: 'ada@uni.edu' }); await call('/login', { email: 'ada@uni.edu' });
assert.equal((await call('/login', { email: 'ada@uni.edu' })).status, 429);
/* reading and editing an entry */
r = await call('/entry?list=PROBLEMS&index=0', null, tok);
assert.equal(r.status, 200);
assert.equal(r.source, entryAt(problems, 'PROBLEMS', 0).text);
assert.equal((await call('/entry?list=NOPE&index=0', null, tok)).status, 400);
assert.equal((await call('/entry?list=PROBLEMS&index=99', null, tok)).status, 409);
const edited = { ...before[0], title: 'An edited title', notice: 'Edited on the site.' };
assert.equal((await call('/edit', { list: 'PROBLEMS', index: 0, was: r.source, entry: edited }, tok, 'https://evil.example')).status, 403, 'edits come from the site only');
assert.equal((await call('/edit', { list: 'PROBLEMS', index: 0, was: r.source, entry: edited })).status, 401);
assert.equal((await call('/edit', { list: 'PROBLEMS', index: 0, was: r.source, entry: { ...edited, number: 42 } }, tok)).status, 400, 'the number cannot change');
assert.equal((await call('/edit', { list: 'PROBLEMS', index: 0, was: r.source + ' ', entry: edited }, tok)).status, 409, 'a stale copy is refused');
const firstSource = r.source;
r = await call('/edit', { list: 'PROBLEMS', index: 0, was: firstSource, entry: edited }, tok);
assert.equal(r.status, 200); assert.equal(r.mode, 'direct'); assert.ok(r.commit.startsWith('https://github.com/org/repo/commit/'));
assert.equal(r.source, entryAt(repo.main['data/problems.js'], 'PROBLEMS', 0).text, 'the answer carries the text the file now holds');
let P1 = load(repo.main['data/problems.js']).PROBLEMS;
assert.equal(P1.length, before.length);
assert.equal(P1[0].title, 'An edited title'); assert.equal(P1[0].notice, 'Edited on the site.');
assert.deepEqual(P1[0].history, before[0].history);
assert.deepEqual(P1.slice(1), before.slice(1), 'the other problems are untouched');
assert.equal((await call('/edit', { list: 'PROBLEMS', index: 0, was: firstSource, entry: edited }, tok)).status, 409, 'the old text is stale now');
assert.equal((await call('/edit', { list: 'PROBLEMS', index: 0, was: r.source, entry: { ...edited, title: 'Edited twice' } }, tok)).status, 200, 'the returned text lets the same form save again');
assert.equal(load(repo.main['data/problems.js']).PROBLEMS[0].title, 'Edited twice');
/* adding and removing */
r = await call('/add', { list: 'CONTRIBUTIONS', entry: { problem: before[0].number, date: '2026-10-17', kind: 'comment', title: 'A comment', material: 'note', ai: 'none', by: ['Ada'], provisional: false, summary: 'Hi \\(x\\).', url: '' } }, tok);
assert.equal(r.status, 200);
assert.deepEqual(load(repo.main['data/contributions.js']).CONTRIBUTIONS.at(-1), { problem: before[0].number, date: '2026-10-17', kind: 'comment', title: 'A comment', material: 'note', ai: 'none', by: ['Ada'], provisional: false, summary: 'Hi \\(x\\).', url: '' });
r = await call('/add', { list: 'PROBLEMS', entry: { title: 'A new problem', status: 'open', goals: ['framework'], topics: [], posedBy: ['Ada'], statement: 'S', history: [], references: [] } }, tok);
assert.equal(r.status, 200); assert.equal(r.entry.number, n, 'the next number is assigned');
assert.deepEqual(Object.keys(r.entry)[0], 'number');
P1 = load(repo.main['data/problems.js']).PROBLEMS;
assert.equal(P1.length, before.length + 1); assert.equal(P1.at(-1).number, n); assert.equal(P1.at(-1).title, 'A new problem');
r = await call('/add', { list: 'POSTS', entry: { title: 'Hello, World!', date: '2026-10-17', by: ['Ada'], body: 'B' } }, tok);
assert.equal(r.status, 200); assert.equal(r.entry.slug, 'hello-world');
assert.equal((await call('/add', { list: 'GOALS', entry: { id: 'x', title: 'T' } }, tok)).status, 400);
const cIndex = load(repo.main['data/contributions.js']).CONTRIBUTIONS.length - 1;
const cEntry = await call(`/entry?list=CONTRIBUTIONS&index=${cIndex}`, null, tok);
r = await call('/remove', { list: 'CONTRIBUTIONS', index: cIndex, was: cEntry.source }, tok);
assert.equal(r.status, 200);
assert.equal(load(repo.main['data/contributions.js']).CONTRIBUTIONS.length, cIndex);
assert.equal((await call('/remove', { list: 'GOALS', index: 0, was: 'x' }, tok)).status, 400);
/* a concurrent change: GitHub refuses the first commit, the edit is applied to the fresh text */
let bumped = false;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => { if (!bumped && init && init.method === 'PUT') { bumped = true; repo.main['data/posts.js'] = repo.main['data/posts.js'].replace('const POSTS = [', 'const POSTS = [\n  { slug: "first", title: "First" },'); } return realFetch(url, init); };
const postIndex = load(repo.main['data/posts.js']).POSTS.length - 1;
const pEntry = await call(`/entry?list=POSTS&index=${postIndex}`, null, tok);
r = await call('/edit', { list: 'POSTS', index: postIndex, was: pEntry.source, entry: { ...evalEntry(pEntry.source), title: 'Renamed' } }, tok);
assert.equal(r.status, 409, 'after a concurrent change the index points elsewhere, so the stale check fires rather than a wrong edit');
globalThis.fetch = realFetch;
assert.ok(bumped);
/* the queue: a submission arrives as a pull request, is shown, accepted; another is declined with a note */
const subToken = (await (async () => { await call('/submit', { type: 'contribution', email: 'x@mit.edu', by: ['X'], ai: 'none', consent: true, fields: { problem: String(before[0].number), kind: 'claim', title: 'Claimed', material: 'manuscript', summary: 'Done.', url: 'https://arxiv.org/abs/1' } }); return /verify\?t=([\w-]+)/.exec(mails.at(-1).textContent)[1]; })());
const v = await worker.fetch(new Request('https://svc.example/verify?t=' + subToken), env);
assert.equal(v.status, 303);
assert.equal(pulls.length, 1);
r = await call('/queue', null, tok);
assert.equal(r.status, 200); assert.equal(r.pulls.length, 1); assert.equal(r.pulls[0].number, 1); assert.deepEqual(r.pulls[0].labels, ['submission']); assert.equal(r.pulls[0].fork, false);
r = await call('/pr?number=1', null, tok);
assert.equal(r.status, 200); assert.equal(r.pull.files.length, 2, 'the claim changes contributions.js and problems.js');
assert.ok(r.pull.files.some(f => f.path === 'data/contributions.js' && f.patch.includes('+    title: "Claimed"')));
assert.equal((await call('/accept', { number: 'x' }, tok)).status, 400);
r = await call('/accept', { number: 1 }, tok);
assert.equal(r.status, 200); assert.equal(mergedCalls.length, 1); assert.equal(mergedCalls[0].merge_method, 'squash');
assert.ok(deleted.some(b => b.startsWith('submission/')), 'the submission branch is deleted after the merge');
assert.equal(load(repo.main['data/contributions.js']).CONTRIBUTIONS.at(-1).title, 'Claimed');
assert.equal(load(repo.main['data/problems.js']).PROBLEMS[0].status, 'under-revision');
assert.equal((await call('/accept', { number: 1 }, tok)).status, 409, 'cannot accept twice');
pulls.push({ number: 2, title: 'Submission: conflicting', body: '', state: 'open', html_url: 'https://github.com/org/repo/pull/2', user: { login: 'x' }, created_at: '2026-10-17T10:00:00Z', updated_at: '2026-10-17T10:00:00Z', labels: [], head: { ref: 'feature', repo: { full_name: 'someone/fork' } }, base: { ref: 'main' }, draft: false, mergeable: false }); prSeq = 2;
assert.equal((await call('/accept', { number: 2 }, tok)).status, 409, 'an unmergeable pull request is reported');
r = await call('/decline', { number: 2, reason: 'Thanks, but @everyone #1 this duplicates Problem 1.' }, tok);
assert.equal(r.status, 200);
assert.equal(pulls[1].state, 'closed');
assert.equal(comments.length, 1); assert.ok(comments[0].body.includes('Ada Lovelace, moderator')); assert.ok(!comments[0].body.includes('@everyone') && !comments[0].body.includes('#1 '), 'no pings or issue references');
assert.ok(!deleted.includes('feature'), 'branches of forks and of people are left alone');
/* pull-request mode: edits become pull requests on an edit/ branch */
env.EDIT_MODE = 'pull-request';
const e0 = await call('/entry?list=PROBLEMS&index=1', null, tok);
r = await call('/edit', { list: 'PROBLEMS', index: 1, was: e0.source, entry: { ...evalEntry(e0.source), title: 'Via pull request' } }, tok);
assert.equal(r.status, 200); assert.equal(r.mode, 'pull-request'); assert.ok(r.pr.startsWith('https://github.com/org/repo/pull/'));
const epr = pulls.at(-1);
assert.ok(epr.head.ref.startsWith('edit/edit-problem-'), epr.head.ref); assert.deepEqual(epr.labels.map(l => l.name), ['edit']);
assert.equal(load(repo.main['data/problems.js']).PROBLEMS[1].title, before[1].title, 'main is unchanged until the pull request is merged');
assert.equal(load(repo[epr.head.ref]['data/problems.js']).PROBLEMS[1].title, 'Via pull request');
env.EDIT_MODE = '';
/* signing out, and losing the moderator role */
const bobLink = async () => { await call('/login', { email: 'bob@inst.org' }); return /login=([\w-]+)/.exec(mails.at(-1).textContent)[1]; };
const bobTok = (await call('/session', { login: await bobLink() })).token;
assert.equal((await call('/me', null, bobTok)).name, 'bob');
env.MODERATOR_EMAILS = 'Ada Lovelace <ada@uni.edu>';
assert.equal((await call('/me', null, bobTok)).status, 403, 'an address taken off the list is signed out');
assert.equal((await call('/me', null, bobTok)).status, 401);
assert.equal((await call('/logout', {}, tok)).status, 200);
assert.equal((await call('/me', null, tok)).status, 401);
env.MODERATOR_EMAILS = '';
assert.equal((await call('/login', { email: 'ada@uni.edu' })).status, 503, 'no list, no sign-in');
console.error = origError; console.log = origLog;

console.log('submit/worker.js: all checks passed');
