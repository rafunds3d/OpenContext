/* Topic pages: the list of all topics and the problems carrying one topic.
   Every function here returns an HTML string; helpers and data come from the files loaded before it (see index.html). */

function viewTags() {
  const topics = TOPICS.slice().sort((a, b) => a.name.localeCompare(b.name));
  return `<h1 class="page-title">Topics</h1>
  <p class="prose" style="text-align:center">Finer tags across the three goals. The number is how many problems carry the tag.</p>
  ${topics.length ? `<ul class="rows">${topics.map(t => `<li class="row" style="grid-template-columns:minmax(0,1fr) auto"><span class="row-title"><a href="#/tag/${t.slug}">${esc(t.name)}</a></span><span class="muted">${t.count}</span></li>`).join('')}</ul>` : '<p class="muted">No topics yet.</p>'}`;
}

function viewTag(s) {
  const t = topicBySlug(s);
  if (!t) return viewNotFound(`There is no topic “${esc(s)}”.`);
  const list = PROBLEMS.filter(p => (p.topics || []).includes(t.name)).sort(byNumber);
  return `<p class="crumb"><a href="#/tags">All topics</a></p>
  <h1 class="page-title">${esc(t.name)}</h1>
  ${rows(list, { since: true })}`;
}
