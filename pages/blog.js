/* The blog: informal posts about problems, and challenges to the goals of the agenda.
   Every function here returns an HTML string; helpers and data come from the files loaded before it (see index.html). */

function viewBlog() {
  const items = postsAll().map(x => `<li class="row" style="grid-template-columns:minmax(0,1fr)">
    <span class="row-title"><a href="#/blog/${esc(x.slug)}">${esc(x.title)}</a>${x.challengeTo ? ' <span class="st st-under-revision">challenge</span>' : ''}</span>
    <p class="row-meta"><span>${fmtDate(x.date, true)}</span>${(x.by || []).length ? `<span>by ${names(x.by)}</span>` : ''}${(x.problems || []).length ? `<span>${x.problems.map(n => `<a href="#/problem/${esc(n)}">Problem ${esc(n)}</a>`).join(', ')}</span>` : ''}</p>
    ${x.summary ? `<p class="row-q">${esc(x.summary)}</p>` : ''}
  </li>`).join('');
  return `<h1 class="page-title">Blog</h1>
  <div class="prose">
  <p>Blog-like posts discuss a problem more informally than a contribution to its entry: a line of attack worth sharing, a reading of the literature, a question about scope, or an objection. Posts that state a challenge to one of the goals of the <a href="#/agenda">agenda</a> are marked as such; the moderators collect them as the starting material for the second round of the list, in which challenges become an entry type of their own (see <a href="#/future-goals">future broad goals</a>). Posts reach the site through the same lightweight moderation as everything else, and carry the names of the people responsible for them.</p>
  </div>
  ${items ? `<ul class="rows">${items}</ul>` : '<p class="muted" style="text-align:center">No posts yet.</p>'}
  <p style="text-align:center;margin-top:1.4rem"><a class="btn btn-small" href="#/submit?type=post">Write a post</a></p>`;
}

function viewPost(s) {
  const x = postBySlug(s);
  if (!x) return viewNotFound(`There is no post “${esc(s)}”.`);
  return `<p class="crumb"><a href="#/blog">All posts</a></p>
  ${postArticle(x)}`;
}
function postArticle(x) {
  const g = x.challengeTo ? goalById(x.challengeTo) : null;
  return `<article class="prose post" data-edit="POSTS:${POSTS.indexOf(x)}">
    <h1 class="post-title">${esc(x.title)}</h1>
    <p class="post-meta" data-edit-slot>${fmtDate(x.date)}${(x.by || []).length ? ` · ${names(x.by)}` : ''}${aiUseLabel(x.ai) ? ` · ${esc(aiUseLabel(x.ai))}` : ''}</p>
    ${g ? `<p class="notice">A challenge to Goal ${g.numeral}, <a href="#/agenda?to=${g.id}">${esc(g.title)}</a>. Challenges state the objection, the assumption or motivation they contest, and what the goal would lose if the objection held. They have no solution and stay open for discussion.</p>` : ''}
    ${x.summary ? `<p><strong>${esc(x.summary)}</strong></p>` : ''}
    ${paras(x.body)}
    ${(x.problems || []).length ? `<p class="small muted">About ${x.problems.map(n => `<a href="#/problem/${esc(n)}">Problem ${esc(n)}</a>`).join(', ')}.</p>` : ''}
  </article>`;
}
