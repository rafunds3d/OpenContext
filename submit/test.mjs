/* Checks for the pure helpers of worker.js, run with `node test.mjs` (or `npm test`) from this folder. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validate, buildEntry, serializeEntry, insertBeforeMarker, nextProblemNumber, uniqueSlug, markUnderRevision, quickDomainCheck, matchesDomain } from './worker.js';

const problems = readFileSync(new URL('../data/problems.js', import.meta.url), 'utf8');
const contributions = readFileSync(new URL('../data/contributions.js', import.meta.url), 'utf8');
const posts = readFileSync(new URL('../data/posts.js', import.meta.url), 'utf8');
/* load a data file the way the browser does: tex`…` is String.raw */
const load = src => new Function('tex', src + '\nreturn { PROBLEMS: typeof PROBLEMS !== "undefined" ? PROBLEMS : null, CONTRIBUTIONS: typeof CONTRIBUTIONS !== "undefined" ? CONTRIBUTIONS : null, POSTS: typeof POSTS !== "undefined" ? POSTS : null };')(String.raw);

/* domains */
assert.equal(quickDomainCheck('gmail.com'), false);
assert.equal(quickDomainCheck('mit.edu'), true);
assert.equal(quickDomainCheck('physics.ox.ac.uk'), true);
assert.equal(quickDomainCheck('unicamp.edu.br'), true);
assert.equal(quickDomainCheck('uni-ulm.de'), null);
assert.equal(quickDomainCheck('perimeterinstitute.ca', ['perimeterinstitute.ca']), true);
assert.equal(quickDomainCheck('not a domain'), false);
assert.equal(matchesDomain('mail.uni-ulm.de', ['uni-ulm.de']), true);
assert.equal(matchesDomain('notuni-ulm.de', ['uni-ulm.de']), false);

/* a submitted problem round-trips through data/problems.js */
const sub = validate({ type: 'problem', email: 'Ada@Phys.Uni-Ulm.de ', by: ['Ada Lovelace (Ulm)', ''], ai: 'partial', consent: true,
  fields: { title: 'A test `problem`', goals: 'classicality, framework', topics: 'Test', statement: 'Is \\(x\\) equal to \\[y\\]?\n\nSecond paragraph with ${braces} and a trailing backslash \\', background: 'B', relevance: 'R', significance: 'S', references: 'A. Author, Title (2026) | https://arxiv.org/abs/0000.00000\nB. Author, Other (2025)' } });
assert.equal(sub.email, 'ada@phys.uni-ulm.de');
assert.deepEqual(sub.by, ['Ada Lovelace (Ulm)']);
const n = nextProblemNumber(problems);
assert.equal(n, 4);
const entry = buildEntry(sub, { date: '2026-10-17', number: n });
const withProblem = insertBeforeMarker(problems, '/* new problems are added above this line */', '  ' + serializeEntry(entry) + ',\n');
const { PROBLEMS } = load(withProblem);
assert.equal(PROBLEMS.length, 4);
const added = PROBLEMS[3];
assert.equal(added.number, 4);
assert.equal(added.title, 'A test `problem`');
assert.deepEqual(added.goals, ['classicality', 'framework']);
assert.equal(added.statement, 'Is \\(x\\) equal to \\[y\\]?\n\nSecond paragraph with $ {braces} and a trailing backslash');
assert.deepEqual(added.references, [{ text: 'A. Author, Title (2026)', url: 'https://arxiv.org/abs/0000.00000' }, { text: 'B. Author, Other (2025)', url: '' }]);
assert.deepEqual(added.history, [{ date: '2026-10-17', kind: 'posed', text: 'Problem posed through the site.', by: ['Ada Lovelace (Ulm)'] }]);
assert.equal(nextProblemNumber(withProblem), 5);

/* a contribution and a post land in their files */
const c = validate({ type: 'contribution', email: 'a@b.edu', by: ['A'], ai: 'none', consent: true, fields: { problem: '2', kind: 'claim', title: 'A claim', material: 'manuscript', summary: 'We show \\(1=1\\).', url: 'https://arxiv.org/abs/1', provisional: true } });
const withContribution = insertBeforeMarker(contributions, '/* new contributions are added above this line */', '  ' + serializeEntry(buildEntry(c, { date: '2026-10-17' })) + ',\n');
assert.deepEqual(load(withContribution).CONTRIBUTIONS, [{ problem: 2, date: '2026-10-17', kind: 'claim', title: 'A claim', material: 'manuscript', ai: 'none', by: ['A'], provisional: true, summary: 'We show \\(1=1\\).', url: 'https://arxiv.org/abs/1' }]);
const p = validate({ type: 'post', email: 'a@b.edu', by: ['A'], ai: 'full', consent: true, fields: { title: 'Ünïcode title!', summary: 'S', body: 'Body.', problems: '1, x, 3', challengeTo: 'framework' } });
const slugged = uniqueSlug('unicode-title', posts);
const withPost = insertBeforeMarker(posts, '/* new posts are added above this line */', '  ' + serializeEntry(buildEntry(p, { date: '2026-10-17', slug: slugged })) + ',\n');
const post = load(withPost).POSTS[0];
assert.equal(post.slug, 'unicode-title');
assert.deepEqual(post.problems, [1, 3]);
assert.equal(uniqueSlug('unicode-title', withPost), 'unicode-title-2');

/* a claim places the problem under revision, once */
const revised = markUnderRevision(problems, 2, '2026-10-17');
const P = load(revised).PROBLEMS;
assert.equal(P[1].status, 'under-revision');
assert.deepEqual(P[1].history.at(-1), { date: '2026-10-17', kind: 'status', to: 'under-revision', text: 'A solution has been claimed; the problem is placed under revision.', by: [] });
assert.equal(P[0].status, 'open');
assert.equal(P[2].status, 'open');
assert.equal(markUnderRevision(revised, 2, '2026-10-18'), revised);
assert.equal(markUnderRevision(problems, 99, '2026-10-18'), problems);

/* validation refuses what it should */
const base = { type: 'contribution', email: 'a@b.edu', by: ['A'], ai: 'none', consent: true, fields: { problem: '2', kind: 'comment', title: 't', material: 'm', summary: 's' } };
for (const bad of [
  { ...base, email: 'nope' }, { ...base, by: [] }, { ...base, ai: 'maybe' }, { ...base, consent: false }, { ...base, website: 'spam' }, { ...base, type: 'other' },
  { ...base, fields: { ...base.fields, problem: 'x' } }, { ...base, fields: { ...base.fields, kind: 'guess' } }, { ...base, fields: { ...base.fields, url: 'ftp://x' } }, { ...base, fields: { ...base.fields, summary: '' } },
  { ...sub, fields: { ...sub.fields, goals: '' } }, null, 'string'
]) assert.throws(() => validate(bad), `should refuse ${JSON.stringify(bad).slice(0, 60)}`);

console.log('submit/worker.js: all checks passed');
