/* Moderation on the site. Moderators sign in with a link sent to an address on the service's moderator list, and can then
   edit any entry where they read it, add entries, and accept or decline submissions, without touching GitHub: every save
   becomes a commit in their name (or a pull request, if the service is set up that way). All of it goes through the
   service in submit/ (SITE.submit.endpoint); without the service, the Moderate page points at the files on GitHub.
   Nothing here is reachable without a session, and the service checks the session on every request. */

const MOD_KEY = 'oc-moderator';
function modSession() { try { const s = JSON.parse(localStorage.getItem(MOD_KEY) || 'null'); return s && s.token && !(s.expires && s.expires < Date.now()) ? s : null; } catch (e) { return null; } }
function modForget() { try { localStorage.removeItem(MOD_KEY); } catch (e) { /* no storage, no session */ } }
async function modApi(path, body) {
  const s = modSession();
  const r = await fetch(submitEndpoint() + path, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(s ? { Authorization: 'Bearer ' + s.token } : {}) }, body: body ? JSON.stringify(body) : undefined })
    .catch(() => { throw new Error('The service could not be reached.'); });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { modForget(); initModeration(); }
  if (!r.ok || !j.ok) throw new Error(j.error || `The service answered with an error (${r.status}).`);
  return j;
}

/* what can be edited: the list (as the data files name it), its file, a template with every standard field, where an entry
   is shown, and how it is rendered for the preview */
const EDIT_LISTS = {
  PROBLEMS: { what: 'problem', file: 'data/problems.js', data: () => PROBLEMS, url: e => `#/problem/${e.number}`, render: e => problemArticle(e),
    template: () => ({ number: 0, title: '', status: 'open', goals: [], topics: [], posedBy: [], curatedBy: [], ai: '', statement: '', notice: '', background: '', relevance: '', significance: '', history: [], references: [] }) },
  CONTRIBUTIONS: { what: 'contribution', file: 'data/contributions.js', data: () => CONTRIBUTIONS, url: e => `#/problem/${e.problem}`, render: e => contribRows([e]),
    template: () => ({ problem: 0, date: todayIso(), kind: '', title: '', material: '', ai: '', by: [], provisional: false, summary: '', url: '' }) },
  POSTS: { what: 'post', file: 'data/posts.js', data: () => POSTS, url: e => `#/blog/${e.slug}`, render: e => postArticle(e),
    template: () => ({ slug: '', title: '', date: todayIso(), by: [], ai: '', challengeTo: '', problems: [], summary: '', body: '' }) },
  FUTURE_GOALS: { what: 'direction', file: 'data/goals.js', data: () => FUTURE_GOALS, url: () => '#/future-goals', render: e => directionSection(e),
    template: () => ({ title: '', proposedBy: [], date: todayIso(), ai: '', summary: '', description: '' }) },
  GOALS: { what: 'goal', file: 'data/goals.js', data: () => GOALS, url: e => `#/agenda?to=${e.id}`, render: e => goalSection(e), fixed: true,
    template: () => ({ id: '', numeral: '', title: '', summary: '', description: '' }) }
};
const ROW_TEMPLATES = { history: () => ({ date: todayIso(), kind: 'note', to: '', text: '', by: [], url: '' }), references: () => ({ text: '', url: '' }) };
const HISTORY_KINDS = ['posed', 'status', 'advance', 'interest', 'note'];
const STATUS_TEXT = { 'under-revision': 'A solution has been claimed; the problem is placed under revision.', solved: 'The problem is marked solved.', open: 'The problem is reopened.' };
const LONG_FIELDS = { statement: 6, background: 8, relevance: 5, significance: 5, notice: 3, summary: 4, body: 14, description: 10, text: 2 };
const FIELD_LABELS = { title: 'Title', topics: 'Topics', posedBy: 'Posed by', curatedBy: 'Curated by', by: 'By', statement: 'Statement', notice: 'Notice (shown as a callout above the entry)', background: 'Background', relevance: 'Relevance', significance: 'Significance', history: 'History', references: 'References', material: 'Type of material', summary: 'Summary', url: 'Link', provisional: 'Provisional: incomplete, unpolished, or only partially verified', slug: 'Address (the part after #/blog/)', body: 'Text', description: 'Description', proposedBy: 'Proposed by', numeral: 'Numeral', id: 'Id', text: 'Text', date: 'Date (YYYY-MM-DD)', problems: 'Problems it is about' };
const MATH_HELP = 'Inline math between <code>\\(</code> and <code>\\)</code>, display math between <code>\\[</code> and <code>\\]</code>; a blank line starts a new paragraph. The tags em, strong, a, code, sup, sub and br work too.';

/* ---- the Moderate page: sign-in, the queue of submissions, the lists of entries ---- */
function viewModerate(params) {
  const ep = submitEndpoint();
  const head = `<h1 class="page-title">Moderation</h1>`;
  if (!ep) return `${head}<div class="prose">
    <p>Editing on the site needs the service in <code>submit/</code>, which is not connected yet (<code>SITE.submit.endpoint</code> in <code>data/site.js</code>; see <code>submit/README.md</code>). Until then, moderators edit the data files on GitHub: ${SITE.repo ? ['problems', 'contributions', 'posts', 'goals'].map(f => `<a href="${esc(SITE.repo)}/edit/main/data/${f}.js" rel="noopener">${f}.js</a>`).join(', ') : 'see the repository'}.</p>
    </div>`;
  const login = params.get('login');
  if (login) return `${head}<div class="prose"><p style="text-align:center">Press the button to complete the sign-in on this browser.</p>
    <p style="text-align:center"><button class="btn" type="button" data-complete-login="${esc(login)}">Sign in</button></p>
    <p id="mod-msg" class="callout err" hidden></p></div>`;
  const s = modSession();
  if (!s) return `${head}<div class="prose">
    <p>Moderators sign in with a link sent to their address; you then stay signed in on this browser for 30 days. Once signed in, every problem, contribution, post, goal and direction shows an <span class="edit-link" aria-hidden="true">Edit</span> button next to it, and submissions can be accepted or declined here.</p>
    </div>
    <form id="login-form" class="form" novalidate>
      <div class="field"><label for="login-email">Your e-mail address</label><input id="login-email" name="email" type="email" placeholder="you@your-institution.edu" autocomplete="email"></div>
      <p id="mod-msg" class="callout err" hidden></p>
      <p class="form-actions"><button class="btn" type="submit">Send me a sign-in link</button></p>
    </form>`;
  const sorted = PROBLEMS.slice().sort(byNumber);
  const li = (list, i, label) => `<li><a href="#/edit?list=${list}&amp;index=${i}">${label}</a></li>`;
  const problems = sorted.map(p => li('PROBLEMS', PROBLEMS.indexOf(p), `Problem ${p.number}: ${esc(plain(p.title))}`)).join('');
  const contribs = CONTRIBUTIONS.map((c, i) => li('CONTRIBUTIONS', i, `Problem ${c.problem}, ${esc(contributionKind(c.kind))}: ${esc(plain(c.title))}`)).join('');
  const posts = POSTS.map((x, i) => li('POSTS', i, esc(plain(x.title)))).join('');
  const directions = FUTURE_GOALS.map((g, i) => li('FUTURE_GOALS', i, esc(plain(g.title)))).join('');
  const goals = GOALS.map((g, i) => li('GOALS', i, `${g.numeral}. ${esc(g.title)}`)).join('');
  const block = (title, items, add) => `<h3 class="sub-title">${title}</h3>${items ? `<ul class="mod-list">${items}</ul>` : '<p class="muted small" style="text-align:center">None yet.</p>'}${add ? `<p style="text-align:center"><a class="btn btn-quiet btn-small" href="${add[1]}">${add[0]}</a></p>` : ''}`;
  return `${head}
  <p class="mod-bar">Signed in as <strong>${esc(s.name || s.email)}</strong>${s.name ? ` <span class="muted small">(${esc(s.email)})</span>` : ''} · <button class="linklike" type="button" data-logout>Sign out</button></p>
  <h2 class="sec-title">Submissions awaiting a decision</h2>
  <div id="queue"><p class="muted" style="text-align:center">Loading the open pull requests…</p></div>
  <h2 class="sec-title">Edit an entry</h2>
  <div class="prose"><p>Open any entry on the site and press <span class="edit-link" aria-hidden="true">Edit</span> next to it, or pick it here. A save is published at once as a commit in your name${s.mode === 'pull-request' ? ', unless the service is set to open pull requests instead' : ''}; the public site redeploys within a minute or two, and this browser shows the change immediately.</p></div>
  ${block('Problems', problems, ['Add a problem', '#/edit?list=PROBLEMS&new=1'])}
  ${block('Contributions', contribs, ['Add a contribution', '#/edit?list=CONTRIBUTIONS&new=1'])}
  ${block('Blog posts', posts, ['Add a post', '#/edit?list=POSTS&new=1'])}
  ${block('Future broad goals', directions, ['Add a direction', '#/edit?list=FUTURE_GOALS&new=1'])}
  ${block('Goals of the agenda', goals)}
  <p class="small muted" style="margin-top:1.4rem">Text is published exactly as written, so check the preview before saving. Larger changes, the site's texts and the settings in <code>data/site.js</code> are edited on GitHub as before.</p>`;
}

/* ---- the Edit page: one generic form built from the entry, with a preview ---- */
function viewEdit(params) {
  const list = params.get('list'), spec = EDIT_LISTS[list], isNew = params.get('new') === '1';
  const index = parseInt(params.get('index'), 10);
  if (!spec || (!isNew && !(index >= 0)) || (isNew && spec.fixed)) return viewNotFound('There is no such entry to edit.');
  if (!submitEndpoint()) return viewModerate(new URLSearchParams());
  if (!modSession()) return `<h1 class="page-title">Edit</h1><p class="callout err" style="text-align:center">Editing on the site is for moderators. <a href="#/moderate">Sign in</a> first.</p>`;
  return `<p class="crumb"><a href="#/moderate">Moderation</a></p>
  <h1 class="page-title">${isNew ? `New ${spec.what}` : `Edit ${spec.what}`}</h1>
  <div id="edit-root" data-list="${list}" data-index="${isNew ? '' : index}" data-new="${isNew ? '1' : '0'}"><p class="muted" style="text-align:center">${isNew ? '' : 'Loading the entry from the repository…'}</p></div>`;
}

let editRowSeq = 0;
/* the form: the entry's own fields first, in their order, then the standard fields it lacks (dropped again when left empty) */
function editForm(list, entry, isNew) {
  const spec = EDIT_LISTS[list], template = spec.template();
  const keys = [...Object.keys(entry), ...Object.keys(template).filter(k => !(k in entry))];
  const blank = v => v === '' || v === false || (Array.isArray(v) && !v.length);
  /* a field the entry lacks, or a blank field of a new entry, is dropped again when left empty */
  const fields = keys.map(k => fieldControl(list, k, k in entry ? entry[k] : template[k], k, isNew ? blank(template[k]) && k !== 'status' : !(k in entry), '')).join('');
  return `<form id="edit-form" class="form" novalidate>
    ${fields}
    <p id="edit-msg" class="callout err" hidden></p>
    <p class="form-actions"><button class="btn" type="submit">${isNew ? 'Publish' : 'Save'}</button> <button class="btn btn-quiet" type="button" data-preview>Preview</button>${!isNew && !spec.fixed ? ` <button class="btn btn-quiet" type="button" data-remove>Remove this ${spec.what}</button>` : ''} <span class="small muted" data-mode-note></span></p>
  </form>
  <div id="edit-preview" class="preview" hidden></div>`;
}
function fieldControl(list, key, value, path, optional, ctx) {
  const id = 'f-' + path.replace(/\./g, '-'), opt = optional ? ' data-opt="1"' : '';
  const label = FIELD_LABELS[key] || key;
  const wrap = (text, ctl, help, cls = '') => `<div class="field${cls}"><label for="${id}">${esc(text)}</label>${ctl}${help ? `<p class="help">${help}</p>` : ''}</div>`;
  const sel = (opts, cur, type = '') => { const o = opts.slice(); if (cur !== '' && cur != null && !o.some(x => String(x[0]) === String(cur))) o.push([cur, String(cur)]); return `<select id="${id}" name="${path}"${type ? ` data-type="${type}"` : ''}${opt}>${o.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(cur ?? '') ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`; };
  const input = (cur, type = '', ph = '') => `<input id="${id}" name="${path}" type="text" value="${esc(cur ?? '')}"${type ? ` data-type="${type}"` : ''}${ph ? ` placeholder="${esc(ph)}"` : ''}${opt} autocomplete="off">`;
  const area = (cur, rows) => `<textarea id="${id}" name="${path}" rows="${rows}"${opt}>${esc(cur ?? '')}</textarea>`;
  const wide = ctx ? ' wide' : '';
  if (key === 'number' && list === 'PROBLEMS' && !ctx) return `<div class="field"><span class="label">Number</span><p class="muted small" style="margin:0">${value ? value : 'assigned when the problem is published'}</p><input type="hidden" name="${path}" value="${Number(value) || 0}" data-type="number"></div>`;
  if (key === 'status' && !ctx) return wrap('Status', sel(Object.entries(STATUSES).map(([k, v]) => [k, v.label]), value), 'A change of status is recorded in the history below, dated today; edit the wording there if needed.');
  if (key === 'goals' && Array.isArray(value)) return `<div class="field"><span class="label">Goals it traces to</span><div class="checks">${GOALS.map(g => `<label><input type="checkbox" name="${path}" value="${g.id}" data-type="multi"${opt}${value.includes(g.id) ? ' checked' : ''}> ${g.numeral}. ${esc(g.title)}</label>`).join('')}</div></div>`;
  if (key === 'kind') return wrap('Kind', sel([['', 'Choose…'], ...(ctx === 'history' ? HISTORY_KINDS.map(k => [k, k]) : Object.entries(CONTRIBUTION_KINDS).map(([k, v]) => [k, v.label]))], value));
  if (key === 'to' && ctx === 'history') return wrap('New status (status entries)', sel([['', '—'], ...Object.entries(STATUSES).map(([k, v]) => [k, v.label])], value));
  if (key === 'ai') return wrap('AI assistance', sel([['', 'not stated'], ...Object.entries(AI_USE)], value));
  if (key === 'challengeTo') return wrap('A challenge to a goal?', sel([['', 'No, a discussion'], ...GOALS.map(g => [g.id, `Yes, to Goal ${g.numeral}: ${g.title}`])], value));
  if (key === 'problem' && list === 'CONTRIBUTIONS' && !ctx) return wrap('Problem', sel(PROBLEMS.slice().sort(byNumber).map(p => [p.number, `Problem ${p.number}: ${plain(p.title)}`]), value, 'number'));
  if (typeof value === 'boolean') return `<div class="field${wide}"><label class="check"><input type="checkbox" name="${path}" data-type="boolean"${opt}${value ? ' checked' : ''}> ${esc(label)}</label></div>`;
  if (typeof value === 'number') return wrap(label, input(value, 'number'));
  if (Array.isArray(value)) {
    if (ROW_TEMPLATES[key] || value.some(x => x && typeof x === 'object')) return groupControl(list, key, value, path, optional);
    if (key === 'problems') return wrap(label, input(value.join(', '), 'numbers', 'e.g. 1, 3'), 'Problem numbers, comma-separated.');
    return wrap(label, input(value.join(', '), 'list'), ctx ? '' : 'Comma-separated; commas inside brackets do not separate.');
  }
  if (value && typeof value === 'object') return wrap(label, area(JSON.stringify(value, null, 2), 6).replace('<textarea ', '<textarea data-type="json" '), 'JSON');
  if (key === 'date') return wrap(label, input(value, '', 'YYYY-MM-DD'), '', wide ? '' : '');
  if (LONG_FIELDS[key]) return wrap(label, area(value, ctx ? 2 : LONG_FIELDS[key]), ctx ? '' : MATH_HELP, wide);
  if (key === 'url') return wrap(label, input(value, '', 'https://…'), '', wide);
  return wrap(label, input(value), '', ctx && key === 'text' ? ' wide' : '');
}
function groupControl(list, key, rows, path, optional) {
  const label = FIELD_LABELS[key] || key;
  const items = rows.map(r => groupRow(list, key, r, `${path}.${editRowSeq++}`)).join('');
  return `<div class="field group" data-group="${key}"><span class="label">${esc(label)}</span>
    <div class="rows-edit" data-rows="${path}">${items}</div>
    <p class="form-actions"><button class="btn btn-quiet btn-small" type="button" data-add-row="${key}" data-path="${path}">Add ${key === 'history' ? 'a history entry' : key === 'references' ? 'a reference' : 'an item'}</button></p>
  </div>`;
}
function groupRow(list, key, row, path, auto) {
  const template = ROW_TEMPLATES[key] ? ROW_TEMPLATES[key]() : {};
  const keys = [...Object.keys(template), ...Object.keys(row).filter(k => !(k in template))];   // rows share one layout
  return `<div class="row-edit" data-row${auto ? ' data-auto="1"' : ''}>${keys.map(k => fieldControl(list, k, k in row ? row[k] : template[k], `${path}.${k}`, !(k in row), key)).join('')}<p class="row-tools"><button class="linklike small" type="button" data-del-row>Remove this ${key === 'history' ? 'entry' : 'item'}</button></p></div>`;
}
/* the entry as the form now has it: paths like history.3.text become nested fields; gaps left by removed rows close up */
function readForm(form) {
  const out = {};
  const set = (path, v) => { const parts = path.split('.'); let o = out; for (let i = 0; i < parts.length - 1; i++) { const k = parts[i]; if (o[k] === undefined) o[k] = /^\d+$/.test(parts[i + 1]) ? [] : {}; o = o[k]; } o[parts[parts.length - 1]] = v; };
  const seen = new Set();
  for (const el of form.querySelectorAll('[name]')) {
    const path = el.name, type = el.dataset.type || 'string', opt = el.dataset.opt === '1';
    if (type === 'multi') { if (seen.has(path)) continue; seen.add(path); const vals = [...form.querySelectorAll(`[name="${path}"]`)].filter(x => x.checked).map(x => x.value); if (vals.length || !opt) set(path, vals); continue; }
    let v;
    if (type === 'boolean') v = el.checked;
    else if (type === 'number') { if (el.value.trim() === '') { if (!opt) set(path, 0); continue; } v = Number(el.value); if (!Number.isFinite(v)) throw new Error(`“${path}” must be a number.`); }
    else if (type === 'list') v = splitNames(el.value);
    else if (type === 'numbers') v = el.value.split(/[,\s]+/).map(Number).filter(n => Number.isInteger(n) && n > 0);
    else if (type === 'json') { try { v = JSON.parse(el.value); } catch (e) { throw new Error(`The field “${path}” is not valid JSON.`); } }
    else v = el.value.replace(/\r\n?/g, '\n').trim();
    const empty = v === '' || v === false || (Array.isArray(v) && !v.length);
    if (opt && empty) continue;
    set(path, v);
  }
  const compact = x => Array.isArray(x) ? x.filter(() => true).map(compact) : (x && typeof x === 'object') ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, compact(v)])) : x;
  return compact(out);
}
/* Reads an entry as the data files write it (JSON strings, tex`…` text, numbers, booleans, lists, objects, comments)
   without running it. Throws on anything else, including template expressions. */
function parseEntrySource(src) {
  let i = 0;
  const n = src.length, err = m => { throw new Error(`${m} (position ${i})`); };
  const ws = () => { for (;;) { while (i < n && /\s/.test(src[i])) i++; if (src.startsWith('//', i)) { const e = src.indexOf('\n', i); i = e < 0 ? n : e; continue; } if (src.startsWith('/*', i)) { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; } return; } };
  const value = () => {
    ws();
    const c = src[i];
    if (c === '{') {
      i++; const o = {};
      for (;;) {
        ws(); if (src[i] === '}') { i++; return o; }
        const m = /^([A-Za-z_$][\w$]*|"[^"\\]*"|'[^'\\]*')\s*:/.exec(src.slice(i, i + 200));
        if (!m) err('a field name was expected');
        i += m[0].length;
        const k = /^["']/.test(m[1]) ? m[1].slice(1, -1) : m[1];
        if (k === '__proto__') err('an unexpected field name');
        o[k] = value(); ws();
        if (src[i] === ',') i++; else if (src[i] !== '}') err('a comma was expected');
      }
    }
    if (c === '[') {
      i++; const a = [];
      for (;;) { ws(); if (src[i] === ']') { i++; return a; } a.push(value()); ws(); if (src[i] === ',') i++; else if (src[i] !== ']') err('a comma was expected'); }
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; }
      if (j >= n) err('an unterminated string');
      const raw = src.slice(i, j + 1); i = j + 1;
      try { return JSON.parse(c === '"' ? raw : '"' + raw.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"') + '"'); } catch (e) { return raw.slice(1, -1).replace(/\\(.)/g, '$1'); }
    }
    if (c === '`' || src.startsWith('tex`', i)) {
      const q = src.indexOf('`', i); let j = q + 1;
      while (j < n && src[j] !== '`') { if (src[j] === '\\' && src[j + 1] === '`') j++; j++; }
      if (j >= n) err('an unterminated text');
      const raw = src.slice(q + 1, j); i = j + 1;
      if (raw.includes('${')) err('a template expression');
      return raw;
    }
    const m = /^(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)(?![\w$])/.exec(src.slice(i, i + 40));
    if (m) { i += m[0].length; return JSON.parse(m[0]); }
    err('unexpected text');
  };
  const v = value(); ws();
  if (src[i] === ',') i++;
  ws();
  if (i < n) err('unexpected text after the entry');
  return v;
}

/* wiring, called by the router after the page is rendered */
async function initEditPage() {
  const root = $('#edit-root');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = '1';
  const list = root.dataset.list, spec = EDIT_LISTS[list], isNew = root.dataset.new === '1', index = Number(root.dataset.index);
  let entry = spec.template(), original = null;
  if (!isNew) {
    try {
      const r = await modApi(`/entry?list=${list}&index=${index}`);
      root._was = r.source;
      original = parseEntrySource(r.source);
      if (!original || typeof original !== 'object' || Array.isArray(original)) throw new Error('not an entry');
      entry = original;
    } catch (e) {
      const local = spec.data()[index];
      const gh = SITE.repo ? ` <a href="${esc(SITE.repo)}/edit/main/${spec.file}" rel="noopener">Edit it on GitHub</a> instead.` : '';
      root.innerHTML = `<p class="callout err">${esc(e.message)}${root._was ? ` This entry could not be read as data, which happens when it was written with unusual formatting.${gh}` : ''}</p>${local ? `<div class="preview">${spec.render(local)}</div>` : ''}`;
      typeset(root);
      return;
    }
  }
  root.innerHTML = editForm(list, entry, isNew);
  const s = modSession(), note = root.querySelector('[data-mode-note]');
  if (note) note.textContent = s && s.mode === 'pull-request' ? 'Saving opens a pull request for review.' : 'Saving publishes the change at once, as a commit in your name.';
  const form = $('#edit-form'), msg = $('#edit-msg'), preview = $('#edit-preview');
  const say = (t, ok) => { msg.innerHTML = t; msg.className = 'callout' + (ok ? ' ok' : ' err'); msg.hidden = false; msg.scrollIntoView({ block: 'nearest' }); };
  /* a change of status gets its dated history entry, kept in step with the select until the moderator edits it */
  const status = form.querySelector('[name="status"]');
  if (status && original && list === 'PROBLEMS') status.addEventListener('change', () => {
    const rows = form.querySelector('[data-rows="history"]');
    const auto = rows && rows.querySelector('[data-row][data-auto]');
    if (status.value === (original.status || 'open')) { if (auto) auto.remove(); return; }
    if (!rows) return;
    const row = { date: todayIso(), kind: 'status', to: status.value, text: STATUS_TEXT[status.value] || `Status changed to ${statusInfo(status.value).label}.`, by: [] };
    if (auto) { auto.querySelector('[name$=".to"]').value = status.value; const t = auto.querySelector('[name$=".text"]'); if (Object.values(STATUS_TEXT).includes(t.value.trim())) t.value = row.text; return; }
    rows.insertAdjacentHTML('beforeend', groupRow(list, 'history', row, `history.${editRowSeq++}`, true));
  });
  form.addEventListener('click', e => {
    const add = e.target.closest('[data-add-row]');
    if (add) { const rows = form.querySelector(`[data-rows="${add.dataset.path}"]`); rows.insertAdjacentHTML('beforeend', groupRow(list, add.dataset.addRow, ROW_TEMPLATES[add.dataset.addRow] ? ROW_TEMPLATES[add.dataset.addRow]() : {}, `${add.dataset.path}.${editRowSeq++}`)); rows.lastElementChild.querySelector('input,select,textarea').focus(); return; }
    const del = e.target.closest('[data-del-row]');
    if (del) { del.closest('[data-row]').remove(); return; }
    if (e.target.closest('[data-preview]')) {
      try { preview.innerHTML = `<p class="small muted" style="margin:0 0 .4rem">Preview</p>${spec.render(readForm(form))}`; preview.hidden = false; typeset(preview); preview.scrollIntoView({ block: 'nearest' }); }
      catch (err) { say(esc(err.message)); }
      return;
    }
    const rm = e.target.closest('[data-remove]');
    if (rm) {
      if (rm.dataset.armed !== '1') { rm.dataset.armed = '1'; rm.textContent = `Yes, remove this ${spec.what} from the site`; setTimeout(() => { rm.dataset.armed = ''; rm.textContent = `Remove this ${spec.what}`; }, 6000); return; }
      save(true);
    }
  });
  form.addEventListener('submit', e => { e.preventDefault(); save(false); });
  async function save(remove) {
    let next;
    try { next = readForm(form); } catch (err) { return say(esc(err.message)); }
    if (!remove && !String(next.title || '').trim()) return say('The entry needs a title.');
    if (!remove && list === 'CONTRIBUTIONS' && !next.kind) return say('Choose the kind of contribution.');
    if (isNew && list === 'PROBLEMS') delete next.number;
    for (const b of form.querySelectorAll('button')) b.disabled = true;
    try {
      const r = remove ? await modApi('/remove', { list, index, was: root._was })
        : isNew ? await modApi('/add', { list, entry: next })
        : await modApi('/edit', { list, index, was: root._was, entry: next });
      const saved = r.entry || next;
      if (r.mode !== 'pull-request') {   // this browser shows the change at once; the public site follows when GitHub Pages redeploys
        const data = spec.data();
        if (remove) data.splice(index, 1);
        else if (isNew) data.push(saved);
        else { const o = data[index]; if (o) { for (const k of Object.keys(o)) delete o[k]; Object.assign(o, saved); } }
      }
      const where = r.mode === 'pull-request' ? `opened <a href="${esc(r.pr)}" rel="noopener">a pull request</a>; it appears on the site once merged` : `published${r.commit ? ` (<a href="${esc(r.commit)}" rel="noopener">the commit</a>)` : ''}; the public site redeploys within a minute or two`;
      say(`${remove ? 'Removed' : isNew ? 'Added' : 'Saved'} and ${where}. ${remove ? `<a href="#/moderate">Back to moderation</a>.` : `<a href="${esc(spec.url(saved))}">View the ${spec.what}</a>${isNew ? '' : ', or keep editing below'}.`}`, true);
      if (remove) form.hidden = true;
      else if (isNew) { for (const el of form.querySelectorAll('input,select,textarea')) el.disabled = true; }   // a new entry is edited from its own page
      else if (r.mode !== 'pull-request') root._was = r.source || null;   // the file now holds this text; in pull-request mode the base branch is unchanged
    } catch (err) { say(esc(err.message)); }
    for (const b of form.querySelectorAll('button')) b.disabled = false;
    if (isNew) form.querySelector('button[type=submit]').disabled = true;
  }
}
async function initModeratePage() {
  const msg = $('#mod-msg');
  const say = (t, ok) => { if (!msg) return; msg.innerHTML = t; msg.className = 'callout' + (ok ? ' ok' : ' err'); msg.hidden = false; };
  const login = $('#login-form');
  if (login && !login.dataset.ready) {
    login.dataset.ready = '1';
    login.addEventListener('submit', async e => {
      e.preventDefault();
      const email = login.elements.namedItem('email').value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return say('Enter your e-mail address.');
      const btn = login.querySelector('button'); btn.disabled = true;
      try { await modApi('/login', { email }); say(`A sign-in link has been sent to <strong>${esc(email)}</strong>; it is valid for 15 minutes. If nothing arrives, check your spam folder.`, true); login.hidden = true; }
      catch (err) { say(esc(err.message)); }
      btn.disabled = false;
    });
  }
  const queue = $('#queue');
  if (queue && !queue.dataset.ready) { queue.dataset.ready = '1'; loadQueue(queue); }
}
async function loadQueue(queue) {
  try {
    const r = await modApi('/queue');
    const pulls = r.pulls || [];
    if (!pulls.length) { queue.innerHTML = '<p class="muted" style="text-align:center">Nothing is waiting: there are no open pull requests.</p>'; return; }
    queue.innerHTML = `<ul class="pulls">${pulls.map(p => `<li class="pull" data-number="${p.number}">
      <p class="pull-title">${esc(p.title)} <span class="small muted">#${p.number}${p.labels.length ? ` · ${p.labels.map(esc).join(', ')}` : ''}${p.fork ? ' · from a fork' : ''}${p.draft ? ' · draft' : ''}</span></p>
      <p class="small muted" style="margin:0">Opened ${fmtDate(String(p.created || '').slice(0, 10), true)} by ${esc(p.author)}${p.updated && p.updated.slice(0, 10) !== String(p.created).slice(0, 10) ? `, updated ${fmtDate(p.updated.slice(0, 10), true)}` : ''} · <a href="${esc(p.url)}" rel="noopener">on GitHub</a></p>
      ${p.body ? `<details class="small"><summary>Description</summary><pre class="pull-body">${esc(p.body)}</pre></details>` : ''}
      <div class="pull-detail" hidden></div>
      <p class="pull-actions"><button class="btn btn-quiet btn-small" type="button" data-show="${p.number}">Show the changes</button> <button class="btn btn-small" type="button" data-accept="${p.number}">Accept</button> <button class="btn btn-quiet btn-small" type="button" data-decline="${p.number}">Decline…</button></p>
      <div class="decline-box" hidden><div class="field"><label for="reason-${p.number}">A note for the submitter (optional, posted on the pull request)</label><textarea id="reason-${p.number}" rows="3"></textarea></div><p class="form-actions"><button class="btn btn-small" type="button" data-decline-confirm="${p.number}">Decline and close</button> <button class="linklike small" type="button" data-decline-cancel="${p.number}">Cancel</button></p></div>
      <p class="callout err small" data-pull-msg hidden></p>
    </li>`).join('')}</ul>`;
    if (!queue.dataset.wired) { queue.dataset.wired = '1'; queue.addEventListener('click', onQueueClick); }
  } catch (err) { queue.innerHTML = `<p class="callout err">${esc(err.message)}</p>`; }
}
async function onQueueClick(e) {
  const b = e.target.closest('button[data-show],button[data-accept],button[data-decline],button[data-decline-confirm],button[data-decline-cancel]');
  if (!b) return;
  const li = b.closest('.pull'), n = Number(li.dataset.number), msg = li.querySelector('[data-pull-msg]');
  const say = (t, ok) => { msg.innerHTML = t; msg.className = 'callout small' + (ok ? ' ok' : ' err'); msg.hidden = false; };
  if (b.dataset.decline) { li.querySelector('.decline-box').hidden = false; li.querySelector('textarea').focus(); return; }
  if (b.dataset.declineCancel) { li.querySelector('.decline-box').hidden = true; return; }
  if (b.dataset.show) {
    const box = li.querySelector('.pull-detail');
    if (!box.hidden) { box.hidden = true; b.textContent = 'Show the changes'; return; }
    b.disabled = true;
    try {
      const { pull } = await modApi(`/pr?number=${n}`);
      box.innerHTML = pull.files.map(f => `<p class="small" style="margin:.6rem 0 .2rem"><code>${esc(f.path)}</code> <span class="muted">+${f.additions} −${f.deletions}</span></p>${previewOfPatch(f) || ''}<pre class="patch">${esc(f.patch || '(no text diff)')}</pre>`).join('') + (pull.mergeable === false ? '<p class="callout err small">GitHub reports a conflict with the current site; it has to be resolved on GitHub before it can be accepted.</p>' : '');
      box.hidden = false; b.textContent = 'Hide the changes'; typeset(box);
    } catch (err) { say(esc(err.message)); }
    b.disabled = false;
    return;
  }
  if (b.dataset.accept) {
    if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Yes, accept and publish'; setTimeout(() => { b.dataset.armed = ''; b.textContent = 'Accept'; }, 6000); return; }
    for (const x of li.querySelectorAll('button')) x.disabled = true;
    try { const r = await modApi('/accept', { number: n }); say(`Accepted and merged; the site redeploys within a minute or two (<a href="${esc(r.url)}" rel="noopener">the pull request</a>).`, true); li.querySelector('.pull-actions').remove(); }
    catch (err) { say(esc(err.message)); for (const x of li.querySelectorAll('button')) x.disabled = false; b.dataset.armed = ''; b.textContent = 'Accept'; }
    return;
  }
  if (b.dataset.declineConfirm) {
    for (const x of li.querySelectorAll('button')) x.disabled = true;
    try { const r = await modApi('/decline', { number: n, reason: li.querySelector('textarea').value.trim() }); say(`Declined and closed (<a href="${esc(r.url)}" rel="noopener">the pull request</a>).`, true); li.querySelector('.pull-actions').remove(); li.querySelector('.decline-box').remove(); }
    catch (err) { say(esc(err.message)); for (const x of li.querySelectorAll('button')) x.disabled = false; }
  }
}
/* a submission's entry, rendered as it will appear once merged: the added lines of a data file, read as data (never run) */
function previewOfPatch(f) {
  const list = Object.keys(EDIT_LISTS).find(k => EDIT_LISTS[k].file === f.path && k !== 'GOALS');
  if (!list || !f.patch) return '';
  const added = f.patch.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++')).map(l => l.slice(1)).join('\n');
  const at = added.indexOf('{');
  if (at < 0) return '';
  try {
    /* a pull request can come from anyone on GitHub, so its text is treated like a submission: tags beyond the allowed
       few are shown literally, both in this preview and, if accepted as it is, on the site */
    const guard = x => typeof x === 'string' ? sanitizeMarkup(x) : Array.isArray(x) ? x.map(guard) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, guard(v)])) : x;
    const e = guard(parseEntrySource(added.slice(at)));
    if (!e || typeof e !== 'object' || !e.title) return '';
    return `<div class="preview">${EDIT_LISTS[list].render(e)}</div>`;
  } catch (err) { return ''; }
}
/* On every page: the Moderate link in the header and an Edit button on each entry, for a signed-in moderator only. */
function initModeration() {
  const s = submitEndpoint() ? modSession() : null, nav = $('.nav');
  let link = nav && nav.querySelector('[data-nav="moderate"]');
  if (s && nav && !link) { link = document.createElement('a'); link.href = '#/moderate'; link.dataset.nav = 'moderate'; link.textContent = 'Moderate'; nav.appendChild(link); }
  if (!s && link) link.remove();
  if (!s) return;
  for (const el of document.querySelectorAll('#main [data-edit]')) {
    if (el.dataset.editDone) continue;
    el.dataset.editDone = '1';
    const [list, index] = el.dataset.edit.split(':');
    if (!EDIT_LISTS[list] || !(Number(index) >= 0)) continue;
    const a = document.createElement('a');
    a.className = 'edit-link'; a.href = `#/edit?list=${list}&index=${index}`; a.textContent = 'Edit'; a.title = `Edit this ${EDIT_LISTS[list].what} (moderators)`;
    const slot = el.querySelector('[data-edit-slot]') || el;
    if (slot === el) el.prepend(a); else slot.append(' ', a);
  }
}
document.addEventListener('click', async e => {
  const done = e.target.closest('[data-complete-login]');
  if (done) {
    done.disabled = true;
    const msg = $('#mod-msg');
    try {
      const r = await modApi('/session', { login: done.dataset.completeLogin });
      try { localStorage.setItem(MOD_KEY, JSON.stringify({ token: r.token, email: r.email, name: r.name, expires: r.expires, mode: r.mode })); } catch (err) { throw new Error('This browser does not keep site data, so the sign-in cannot be kept.'); }
      location.replace('#/moderate');
    } catch (err) { if (msg) { msg.textContent = err.message; msg.hidden = false; } done.disabled = false; }
    return;
  }
  if (e.target.closest('[data-logout]')) {
    try { await modApi('/logout', {}); } catch (err) { /* the session is dropped here regardless */ }
    modForget(); initModeration();
    if (location.hash === '#/moderate') route(); else location.replace('#/moderate');
  }
});
