/* The list of all problems, with status tabs, goal filter, search and sorting.
   Every function here returns an HTML string; helpers and data come from the files loaded before it (see index.html). */

function viewProblems(params) {
  const statusParam = params.get('status') || '';
  const status = ['closed', ...Object.keys(STATUSES)].includes(statusParam) ? statusParam : 'all';
  const goal = GOALS.some(g => g.id === params.get('goal')) ? params.get('goal') : '';
  const q = (params.get('q') || '').trim();
  const sortParam = params.get('sort') || '';
  const sort = sortParam || (q ? 'relevance' : 'number');
  let base = q ? search(q) : PROBLEMS.slice();
  if (goal) base = base.filter(p => (p.goals || []).includes(goal));
  const matches = s => s === 'all' ? () => true : s === 'closed' ? isClosed : p => p.status === s;
  const counts = {}; for (const s of ['all', 'open', 'under-revision', 'closed']) counts[s] = base.filter(matches(s)).length;
  let list = base.filter(matches(status));
  if (sort === 'date') list = list.slice().sort(byDateDesc);
  else if (sort === 'number' || !q) list = list.slice().sort(byNumber);
  const link = (o) => `#/problems${qs({ status: o.status === 'all' ? '' : o.status, goal: o.goal, q: o.q, sort: o.sort })}`;
  const tab = (s, label) => (s === 'all' || counts[s] || status === s) ? `<a class="tab${status === s ? ' is-active' : ''}" href="${link({ status: s, goal, q, sort: sortParam })}"${status === s ? ' aria-current="page"' : ''}>${label}<span class="count">${counts[s]}</span></a>` : '';
  const gfilter = GOALS.map(g => `<a class="gchip${goal === g.id ? ' is-on' : ''}" style="${goal === g.id ? 'background:#111;color:#fff' : ''}" href="${link({ status, goal: goal === g.id ? '' : g.id, q, sort: sortParam })}" title="Goal ${g.numeral}: ${esc(g.title)}">${g.numeral}</a>`).join(' ');
  const opt = (v, label) => `<option value="${v}"${sort === v ? ' selected' : ''}>${label}</option>`;
  const empty = q ? `No problems match “${esc(q)}”. Try fewer words, or <a href="#/problems">browse all problems</a>.` : `No problems in this selection yet.`;
  return `<h1 class="page-title">Problems</h1>
  <form class="search" id="search-form" role="search" data-status="${status === 'all' ? '' : status}" data-goal="${goal}">
    <label for="q" class="visually-hidden">Search problems</label>
    <input id="q" name="q" type="search" placeholder="Search problems" value="${esc(q)}" autocomplete="off">
    <button class="btn" type="submit">Search</button>
    <label for="sort" class="visually-hidden">Sort by</label>
    <select id="sort" name="sort">${q ? opt('relevance', 'Relevance') : ''}${opt('number', 'By number')}${opt('date', 'Recently updated')}</select>
  </form>
  <nav class="tabs" aria-label="Filter by status">${tab('all', 'All')}${tab('open', apple() + 'Open')}${tab('under-revision', apple('apple-revision') + 'Under revision')}${tab('closed', apple('apple-done') + 'Resolved')}</nav>
  <div class="filters"><span>Goal:</span> ${gfilter} ${goal ? `<a class="small" href="${link({ status, goal: '', q, sort: sortParam })}">clear</a>` : ''}</div>
  ${q ? `<p class="muted small">${list.length} ${list.length === 1 ? 'result' : 'results'} for “${esc(q)}”. <a href="${link({ status, goal })}">Clear search</a></p>` : ''}
  ${rows(list, { empty, since: true })}`;
}
