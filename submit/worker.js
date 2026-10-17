/* OpenContext submission service: a Cloudflare Worker that turns a submission made on the site into a pull request once
   the sender has confirmed an institutional e-mail address. Setup is in README.md next to this file; the site reaches it
   through SITE.submit.endpoint in data/site.js. The pure helpers are exported so that test.mjs can exercise them with Node.

   Routes:  GET  /check?domain=…   is this an institutional domain?
            POST /submit           validate, store for 24 h, e-mail a confirmation link
            GET  /verify?t=…       file the stored submission as a pull request, then send the browser back to the site */

const UNIVERSITY_LIST = 'https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json';
const FREE_MAIL = ['gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de', 'yahoo.com.br', 'ymail.com', 'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de', 'hotmail.it', 'outlook.com', 'outlook.de', 'live.com', 'live.de', 'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'protonmail.com', 'proton.me', 'pm.me', 'gmx.de', 'gmx.net', 'gmx.com', 'gmx.at', 'gmx.ch', 'web.de', 'mail.com', 'mail.ru', 'yandex.ru', 'yandex.com', 'qq.com', '163.com', '126.com', 'zoho.com', 'fastmail.com', 'hey.com', 'tutanota.com', 'tuta.io', 'posteo.de', 'libero.it', 'orange.fr', 'free.fr', 'uol.com.br', 'bol.com.br', 'terra.com.br'];
const AI_USE = { none: 'no AI assistance', partial: 'partially AI-assisted (several human–AI iterations)', full: 'fully AI-generated (the output of a single prompt)' };
const KINDS = { claim: 'claimed solution', partial: 'partial result', negative: 'negative result', reformulation: 'reformulation', decomposition: 'decomposition into further problems', evidence: 'computational evidence', verification: 'independent verification', exposition: 'explanatory exposition', challenge: 'challenge to a solution', question: 'question about the statement', comment: 'comment' };
const TYPES = {
  problem:      { file: 'data/problems.js',      marker: '/* new problems are added above this line */',      label: 'new problem' },
  contribution: { file: 'data/contributions.js', marker: '/* new contributions are added above this line */', label: 'contribution' },
  post:         { file: 'data/posts.js',         marker: '/* new posts are added above this line */',         label: 'blog post' },
  direction:    { file: 'data/goals.js',         marker: '/* new entries are added above this line */',       label: 'broad direction' }
};
const FIELDS = {
  problem: ['title', 'goals', 'topics', 'statement', 'background', 'relevance', 'significance', 'references'],
  contribution: ['problem', 'kind', 'title', 'material', 'summary', 'url', 'provisional'],
  post: ['title', 'summary', 'body', 'problems', 'challengeTo'],
  direction: ['title', 'summary', 'description']
};
const REQUIRED = {
  problem: ['title', 'goals', 'statement', 'background', 'relevance', 'significance'],
  contribution: ['problem', 'kind', 'title', 'material', 'summary'],
  post: ['title', 'summary', 'body'],
  direction: ['title', 'summary', 'description']
};
const LINK_TTL = 24 * 3600;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      if (url.pathname === '/check' && request.method === 'GET') {
        const domain = (url.searchParams.get('domain') || '').trim().toLowerCase();
        return json({ domain, institutional: await isInstitutional(domain, env) }, 200, cors);
      }
      if (url.pathname === '/submit' && request.method === 'POST') {
        const sub = validate(await request.json().catch(() => null));
        const domain = sub.email.split('@')[1];
        if (!(await isInstitutional(domain, env))) return json({ ok: false, error: `${domain} is not recognised as an institutional domain. If it should be, write to the moderators.` }, 400, cors);
        const token = crypto.randomUUID() + crypto.randomUUID().slice(0, 8);
        await env.SUBMISSIONS.put('sub:' + token, JSON.stringify(sub), { expirationTtl: LINK_TTL });
        await sendMail(env, sub.email, confirmationMail(sub, `${url.origin}/verify?t=${token}`, env));
        return json({ ok: true }, 200, cors);
      }
      if (url.pathname === '/verify' && request.method === 'GET') {
        const token = url.searchParams.get('t') || '';
        const raw = token && await env.SUBMISSIONS.get('sub:' + token);
        if (!raw) return redirect(env, { error: 'This confirmation link is invalid or has already been used, or it has expired (links are valid for 24 hours). Please submit again.' });
        if (await env.SUBMISSIONS.get('lock:' + token)) return redirect(env, { error: 'This submission is already being filed; please wait a moment.' });
        await env.SUBMISSIONS.put('lock:' + token, '1', { expirationTtl: 120 });
        const pr = await openPullRequest(JSON.parse(raw), env, token.slice(0, 6));
        await env.SUBMISSIONS.delete('sub:' + token);
        return redirect(env, { done: '1', pr });
      }
      return json({ ok: false, error: 'Not found.' }, 404, cors);
    } catch (e) {
      if (url.pathname === '/verify') return redirect(env, { error: 'The submission could not be filed: ' + e.message });
      return json({ ok: false, error: e.message }, e.status || 400, cors);
    }
  }
};

/* responses */
const json = (body, status, headers) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
const corsHeaders = env => ({ 'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' });
function redirect(env, params) {
  const u = new URL(env.SITE_URL || 'https://rafunds3d.github.io/OpenContext/');
  u.hash = '#/submit?' + new URLSearchParams(params).toString();
  return Response.redirect(u.toString(), 303);
}
const fail = (message, status = 400) => Object.assign(new Error(message), { status });

/* institutional domains: free-mail providers are refused; .edu, .edu.xx and .ac.xx accepted at once; everything else is
   looked up in a public list of university domains, cached for a week, plus EXTRA_DOMAINS from wrangler.toml */
export const matchesDomain = (domain, list) => list.some(d => d && (domain === d || domain.endsWith('.' + d)));
export function quickDomainCheck(domain, extra = []) {
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return false;
  if (FREE_MAIL.includes(domain)) return false;
  if (matchesDomain(domain, extra)) return true;
  if (/\.edu$|\.edu\.[a-z]{2,3}$|\.ac\.[a-z]{2,3}$/.test(domain)) return true;
  return null;
}
async function isInstitutional(domain, env) {
  const extra = (env.EXTRA_DOMAINS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const quick = quickDomainCheck(domain, extra);
  if (quick !== null) return quick;
  return matchesDomain(domain, await universityDomains(env));
}
async function universityDomains(env) {
  const cached = await env.SUBMISSIONS.get('domains', 'json');
  if (cached) return cached;
  const r = await fetch(UNIVERSITY_LIST);
  if (!r.ok) throw fail('The list of university domains could not be loaded; please try again later.', 503);
  const list = [...new Set((await r.json()).flatMap(u => u.domains || []).map(d => String(d).toLowerCase()))];
  await env.SUBMISSIONS.put('domains', JSON.stringify(list), { expirationTtl: 7 * 24 * 3600 });
  return list;
}

/* validation: only the fields of the chosen type, cleaned and capped */
const clean = (s, max = 20000) => String(s ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[^\S\n]+$/gm, '').trim().slice(0, max);
export function validate(body) {
  if (!body || typeof body !== 'object') throw fail('Malformed submission.');
  if (body.website) throw fail('Rejected.');                      // honeypot field, hidden on the site
  const type = String(body.type || '');
  if (!TYPES[type]) throw fail('Unknown submission type.');
  const email = clean(body.email, 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail('Enter a valid e-mail address.');
  const by = (Array.isArray(body.by) ? body.by : []).map(s => clean(s, 120)).filter(Boolean).slice(0, 10);
  if (!by.length) throw fail('Name at least one human contributor.');
  const ai = String(body.ai || '');
  if (!AI_USE[ai]) throw fail('Say how much AI assistance was used.');
  if (body.consent !== true) throw fail('Confirm that you take responsibility for the material.');
  const raw = body.fields && typeof body.fields === 'object' ? body.fields : {};
  const fields = {};
  for (const k of FIELDS[type]) fields[k] = k === 'provisional' ? raw[k] === true : clean(raw[k], k === 'title' || k === 'summary' && type !== 'contribution' ? 300 : 20000);
  for (const k of REQUIRED[type]) if (!fields[k]) throw fail(`The field “${k}” is required.`);
  if (type === 'contribution') {
    fields.problem = parseInt(fields.problem, 10);
    if (!(fields.problem > 0)) throw fail('Choose a problem.');
    if (!KINDS[fields.kind]) throw fail('Choose the kind of contribution.');
    if (fields.url && !/^https?:\/\/\S+$/.test(fields.url)) throw fail('Links must start with http:// or https://.');
  }
  if (type === 'post' && fields.challengeTo && !/^[a-z-]{1,40}$/.test(fields.challengeTo)) throw fail('Unknown goal.');
  return { type, email, by, ai, fields };
}

/* the entry, in the same shape and order as the hand-written ones (mirrors buildEntry in js/lib.js) */
export function buildEntry(sub, extra) {
  const { type, by, ai, fields: f } = sub, date = extra.date;
  const list = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
  const lines = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
  if (type === 'problem') return {
    number: extra.number, title: f.title, status: 'open', goals: list(f.goals), topics: list(f.topics), posedBy: by, curatedBy: [], ai,
    statement: f.statement, background: f.background, relevance: f.relevance, significance: f.significance,
    history: [{ date, kind: 'posed', text: 'Problem posed through the site.', by }],
    references: lines(f.references).map(l => { const i = l.indexOf('|'); return i < 0 ? { text: l, url: '' } : { text: l.slice(0, i).trim(), url: l.slice(i + 1).trim() }; })
  };
  if (type === 'contribution') return { problem: f.problem, date, kind: f.kind, title: f.title, material: f.material, ai, by, provisional: !!f.provisional, summary: f.summary, url: f.url || '' };
  if (type === 'post') return { slug: extra.slug, title: f.title, date, by, ai, challengeTo: f.challengeTo || '', problems: list(f.problems).map(Number).filter(n => n > 0), summary: f.summary, body: f.body };
  return { title: f.title, proposedBy: by, date, ai, summary: f.summary, description: f.description };
}
/* written as the JavaScript the data files are made of: tex`…` for text with math or paragraphs, JSON otherwise */
export function serializeEntry(v, ind = '  ') {
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    if (v.every(x => typeof x !== 'object' || x === null)) return '[' + v.map(x => serializeEntry(x, ind)).join(', ') + ']';
    return '[\n' + v.map(x => ind + '  ' + serializeEntry(x, ind + '  ')).join(',\n') + '\n' + ind + ']';
  }
  if (v && typeof v === 'object') return '{\n' + Object.keys(v).map(k => `${ind}  ${k}: ${serializeEntry(v[k], ind + '  ')}`).join(',\n') + '\n' + ind + '}';
  if (typeof v === 'string') {
    if (/[\\\n]/.test(v)) return 'tex`' + v.replace(/`/g, '’').replace(/\$\{/g, '$ {').replace(/[\\\s]+$/, '') + '`';
    return JSON.stringify(v);
  }
  return JSON.stringify(v);
}
export const slugify = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export function insertBeforeMarker(src, marker, text) {
  const i = src.indexOf(marker);
  if (i < 0) throw fail(`The data file has no “${marker}” line.`, 500);
  const lineStart = src.lastIndexOf('\n', i) + 1;
  return src.slice(0, lineStart) + text + src.slice(lineStart);
}
export const nextProblemNumber = src => Math.max(0, ...[...src.matchAll(/\n    number: (\d+),/g)].map(m => Number(m[1]))) + 1;
export function uniqueSlug(base, src) {
  let s = base || 'post', i = 2;
  while (src.includes(`slug: "${s}"`)) s = `${base || 'post'}-${i++}`;
  return s;
}
/* A claimed solution places an open problem under revision: status and a dated history entry, as the guidelines prescribe. */
export function markUnderRevision(src, number, date) {
  const start = src.indexOf(`\n  {\n    number: ${number},`);
  if (start < 0) return src;
  const nextEntry = src.indexOf('\n  {\n    number:', start + 1);
  const end = nextEntry < 0 ? src.length : nextEntry;
  let block = src.slice(start, end);
  if (!/\n    status: "open",/.test(block)) return src;
  block = block.replace(/\n    status: "open",/, '\n    status: "under-revision",');
  const open = block.indexOf('\n    history: ['), close = open < 0 ? -1 : block.indexOf('\n    ]', open);
  if (close < 0) return src;
  const head = '\n    history: [', inner = block.slice(open + head.length, close);
  const entry = `      { date: "${date}", kind: "status", to: "under-revision", text: "A solution has been claimed; the problem is placed under revision.", by: [] }`;
  block = block.slice(0, open) + head + inner + (inner.trim() ? ',\n' : '\n') + entry + block.slice(close);
  return src.slice(0, start) + block + src.slice(end);
}

/* GitHub: a branch, one or two commits, a pull request */
async function gh(env, method, path, body) {
  const r = await fetch('https://api.github.com' + path, {
    method,
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'opencontext-submit', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!r.ok) throw fail(`GitHub answered ${r.status} for ${method} ${path.split('?')[0]}: ${(await r.text()).slice(0, 200)}`, 502);
  return r.status === 204 ? null : r.json();
}
const b64encode = s => { let bin = ''; for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b); return btoa(bin); };
const b64decode = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));

async function openPullRequest(sub, env, suffix) {
  const [owner, repo] = (env.GITHUB_REPO || '').split('/');
  if (!owner || !repo || !env.GITHUB_TOKEN) throw fail('The service is not configured for GitHub yet (GITHUB_REPO or GITHUB_TOKEN missing).', 500);
  const base = env.GITHUB_BASE || 'main', site = env.SITE_NAME || 'OpenContext';
  const date = new Date().toISOString().slice(0, 10);
  const spec = TYPES[sub.type];
  const head = await gh(env, 'GET', `/repos/${owner}/${repo}/git/ref/heads/${base}`);
  const branch = `submission/${sub.type}-${slugify(sub.fields.title).slice(0, 40) || 'entry'}-${suffix}`;
  await gh(env, 'POST', `/repos/${owner}/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: head.object.sha });
  const read = async path => { const f = await gh(env, 'GET', `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`); return { sha: f.sha, text: b64decode(f.content) }; };
  const write = (path, sha, text, message) => gh(env, 'PUT', `/repos/${owner}/${repo}/contents/${path}`, { message, content: b64encode(text), sha, branch });

  const file = await read(spec.file);
  const extra = { date };
  if (sub.type === 'problem') extra.number = nextProblemNumber(file.text);
  if (sub.type === 'post') extra.slug = uniqueSlug(slugify(sub.fields.title).slice(0, 60), file.text);
  const entry = buildEntry(sub, extra);
  const label = sub.type === 'problem' ? `Problem ${entry.number}: ${sub.fields.title}`
    : sub.type === 'contribution' ? `${KINDS[sub.fields.kind]} for Problem ${sub.fields.problem}: ${sub.fields.title}`
    : `${spec.label}: ${sub.fields.title}`;
  await write(spec.file, file.sha, insertBeforeMarker(file.text, spec.marker, '  ' + serializeEntry(entry) + ',\n'), `Add ${label}\n\nSubmitted through the site by ${sub.by.join(', ')}.`);

  let statusNote = '';
  if (sub.type === 'contribution' && sub.fields.kind === 'claim') {
    const pf = await read('data/problems.js');
    const next = markUnderRevision(pf.text, sub.fields.problem, date);
    if (next !== pf.text) {
      await write('data/problems.js', pf.sha, next, `Place Problem ${sub.fields.problem} under revision`);
      statusNote = `\n\nThis is a claimed solution, so the pull request also places Problem ${sub.fields.problem} under revision, as the guidelines prescribe. Remove that part of the diff if the claim should not change the status yet.`;
    }
  }
  const body = [
    `Submitted through the ${site} site on ${date}.`, '',
    `- **Type:** ${label}`,
    `- **Contributors:** ${sub.by.join(', ')}`,
    `- **Verified institutional address:** ${sub.email}`,
    `- **AI assistance:** ${AI_USE[sub.ai]}`,
    ...(sub.fields.url ? [`- **Link:** ${sub.fields.url}`] : []),
    ...(sub.fields.provisional ? ['- **Flagged as provisional** by the contributors.'] : []),
    '', 'Merging publishes the entry; the site redeploys by itself within a minute or two. Edit the diff first if anything needs changing, or close the pull request to decline.' + statusNote
  ].join('\n');
  const pr = await gh(env, 'POST', `/repos/${owner}/${repo}/pulls`, { title: `Submission: ${label}`.slice(0, 250), head: branch, base, body });
  try { await gh(env, 'POST', `/repos/${owner}/${repo}/issues/${pr.number}/labels`, { labels: ['submission'] }); } catch (e) { /* the label needs Issues access on the token; optional */ }
  return pr.html_url;
}

/* the confirmation e-mail, through Brevo (default: verifies a sender address, no domain needed) or Resend */
function confirmationMail(sub, link, env) {
  const site = env.SITE_NAME || 'OpenContext', what = TYPES[sub.type].label, title = sub.fields.title;
  const subject = `Confirm your ${site} submission`;
  const text = `You, or someone using this address, submitted a ${what} to ${site}:\n\n    ${title}\n\nTo confirm the address and file the submission, open this link within 24 hours:\n\n    ${link}\n\nThe submission then reaches the moderators as a pull request and appears on the site once they accept it. If you did not submit anything, ignore this message.`;
  const e = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const html = `<p>You, or someone using this address, submitted a ${e(what)} to ${e(site)}:</p><blockquote><strong>${e(title)}</strong></blockquote><p>To confirm the address and file the submission, open this link within 24 hours:</p><p><a href="${e(link)}">${e(link)}</a></p><p>The submission then reaches the moderators as a pull request and appears on the site once they accept it. If you did not submit anything, ignore this message.</p>`;
  return { subject, text, html };
}
async function sendMail(env, to, { subject, text, html }) {
  if (!env.MAIL_API_KEY || !env.MAIL_FROM) throw fail('The service is not configured for e-mail yet (MAIL_API_KEY or MAIL_FROM missing).', 500);
  const provider = (env.MAIL_PROVIDER || 'brevo').toLowerCase();
  let r;
  if (provider === 'resend') {
    r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.MAIL_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, text, html }) });
  } else {
    const m = /^(.*?)\s*<([^>]+)>\s*$/.exec(env.MAIL_FROM);
    const sender = m ? { name: m[1].replace(/^"|"$/g, ''), email: m[2] } : { email: env.MAIL_FROM };
    r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': env.MAIL_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ sender, to: [{ email: to }], subject, textContent: text, htmlContent: html }) });
  }
  if (!r.ok) throw fail(`The confirmation e-mail could not be sent (${provider} answered ${r.status}).`, 502);
}
