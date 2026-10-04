/* Routing and event wiring. Add a route here when you add a page in pages/. Loaded last. */

function viewNotFound(msg) {
  return `<h1 class="page-title">Not found</h1>
  <p style="text-align:center">${msg || 'There is no page at this address.'}</p>
  <p style="text-align:center"><a href="#/">Go to the home page</a> or <a href="#/problems">browse all problems</a>.</p>`;
}

/* router */
let firstRender = true;
let focusSearchOnRender = false;

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const i = h.indexOf('?');
  const path = (i >= 0 ? h.slice(0, i) : h).replace(/\/+$/, '');
  const params = new URLSearchParams(i >= 0 ? h.slice(i + 1) : '');
  return { path, params };
}
function typeset(el) {
  if (window.MathJax && typeof MathJax.typesetPromise === 'function') {
    if (MathJax.texReset) MathJax.texReset();
    MathJax.typesetPromise([el]).catch(() => {});
  }
}
function setNav(active) {
  for (const a of document.querySelectorAll('.nav a[data-nav]')) {
    if (a.dataset.nav === active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
}
function route() {
  const hash = location.hash;
  const main = $('#main');
  if (hash && !hash.startsWith('#/')) { if (!main.children.length) location.replace('#/'); return; }
  const { path, params } = parseHash();
  let html, title = '', nav = '';
  if (path === '') { html = viewHome(); nav = 'home'; }
  else if (path === 'problems') { html = viewProblems(params); title = 'Problems'; nav = 'problems'; }
  else if (path.startsWith('problem/')) {
    const num = parseInt(path.slice('problem/'.length), 10);
    const p = PROBLEMS.find(x => x.number === num);
    html = viewProblem(num); title = p ? `Problem ${p.number}: ${plain(p.title)}` : 'Not found'; nav = 'problems';
  }
  else if (path === 'agenda') { html = viewAgenda(); title = 'Research agenda'; nav = 'agenda'; }
  else if (path === 'tags') { html = viewTags(); title = 'Topics'; nav = 'tags'; }
  else if (path.startsWith('tag/')) { const t = topicBySlug(path.slice(4)); html = viewTag(path.slice(4)); title = t ? t.name : 'Not found'; nav = 'tags'; }
  else if (path === 'about') { html = viewAbout(); title = 'About'; nav = 'about'; }
  else if (path === 'contribute') { html = viewContribute(); title = 'Contribute'; nav = 'contribute'; }
  else if (path.startsWith('random')) {
    const status = path.split('/')[1] || '';
    const p = randomProblem(status === 'any' ? '' : (status || 'open'));
    location.replace(p ? problemUrl(p) : '#/problems');
    return;
  }
  else { html = viewNotFound(); title = 'Not found'; }

  if (window.MathJax && typeof MathJax.typesetClear === 'function') MathJax.typesetClear();
  main.innerHTML = html;
  document.title = title ? `${title} · ${SITE.name}` : `${SITE.name} · ${SITE.subtitle}`;
  setNav(nav);
  const to = params.get('to') && document.getElementById(params.get('to'));
  if (to) to.scrollIntoView(); else window.scrollTo(0, 0);
  if (!firstRender) main.focus({ preventScroll: true });
  firstRender = false;
  if (focusSearchOnRender) { focusSearchOnRender = false; const i = $('#q'); if (i) i.focus(); }
  typeset(main);
}

/* wiring */
function applySite() {
  document.title = `${SITE.name} · ${SITE.subtitle}`;
  $('#brand-name').textContent = SITE.name;
  $('#foot-name').textContent = SITE.name;
  $('#foot-subtitle').textContent = SITE.subtitle;
  const md = $('meta[name="description"]'); if (md) md.setAttribute('content', SITE.description);
  for (const a of document.querySelectorAll('[data-repo]')) { if (SITE.repo) a.href = SITE.repo; else (a.closest('li') || a).remove(); }
  for (const a of document.querySelectorAll('[data-paper]')) { if (SITE.paper && SITE.paper.url) a.href = SITE.paper.url; else (a.closest('li') || a).remove(); }
}

document.addEventListener('click', e => {
  const reroll = e.target.closest('[data-reroll]');
  if (reroll) {
    const p = randomProblem(reroll.dataset.reroll, Number(reroll.dataset.current));
    if (!p) return;
    const slot = $('.card-slot');
    if (!slot) return;
    if (window.MathJax && typeof MathJax.typesetClear === 'function') MathJax.typesetClear([slot]);
    slot.innerHTML = problemBox(p, { link: true });
    reroll.dataset.current = p.number;
    typeset(slot);
    return;
  }
  if (e.target.closest('[data-top]')) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    return;
  }
  if (e.target.closest('[data-json]')) {
    const data = { site: SITE.name, subtitle: SITE.subtitle, updated: latest(), goals: GOALS.map(g => ({ id: g.id, numeral: g.numeral, title: g.title, summary: g.summary })), problems: PROBLEMS.map(p => ({ ...p, updated: updatedOf(p), statusSince: statusSince(p) })) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = slug(SITE.name) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return;
  }
  if (e.target.closest('[data-skip]')) { e.preventDefault(); $('#main').focus(); }
});

$('#main').addEventListener('submit', e => {
  const f = e.target;
  if (!f.matches('#search-form')) return;
  e.preventDefault();
  const qEl = f.elements.namedItem('q'), sortEl = f.elements.namedItem('sort');
  const q = qEl ? qEl.value.trim() : '';
  const sort = sortEl ? sortEl.value : '';
  location.hash = '#/problems' + qs({ q, status: f.dataset.status || '', goal: f.dataset.goal || '', sort: sort === 'date' ? 'date' : '' });
});

$('#main').addEventListener('change', e => {
  if (e.target.id !== 'sort') return;
  const f = e.target.form;
  const qEl = f.elements.namedItem('q');
  location.hash = '#/problems' + qs({ q: qEl ? qEl.value.trim() : '', status: f.dataset.status || '', goal: f.dataset.goal || '', sort: e.target.value });
});

document.addEventListener('keydown', e => {
  if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
  e.preventDefault();
  const i = $('#q');
  if (i) { i.focus(); i.select(); }
  else { focusSearchOnRender = true; location.hash = '#/problems'; }
});

window.addEventListener('hashchange', route);
applySite();
route();
