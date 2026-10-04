/* The "Future broad goals" page: proposals for broad directions that a later cycle of the list could be organized around.
   Every function here returns an HTML string; helpers and data come from the files loaded before it (see index.html). */

function futureGoalTemplate() {
  return `{
  title: "Name of the direction",
  proposedBy: ["Your Name"],
  date: "${todayIso()}",
  summary: "One sentence on what the direction is.",
  description: tex\`A paragraph or two: the line of inquiry, why it should organize
part of the list, and what near-term problems would trace back to it.\`
},`;
}

function viewFutureGoals() {
  const list = (typeof FUTURE_GOALS !== 'undefined' ? FUTURE_GOALS : []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const items = list.map(g => `<section class="prose">
    <h2 class="sec-title">${apple('apple-goal')} ${esc(g.title)}</h2>
    <p class="muted small" style="text-align:center;margin-top:-.4rem">Proposed ${g.date ? fmtDate(g.date) : ''}${(g.proposedBy || []).length ? ` by ${names(g.proposedBy)}` : ''}</p>
    ${g.summary ? `<p><strong>${esc(g.summary)}</strong></p>` : ''}
    ${paras(g.description)}
  </section>`).join('');
  return `<h1 class="page-title">Future broad goals</h1>
  <div class="prose">
  <p>The goals that organize the current cycle of the list, ${esc(SITE.edition || SITE.name)}, are provisional: they describe where the field's existing lines of inquiry are heading and serve to organize the problems, not to settle what is worth pursuing. Several directions may coexist, and anyone may propose another. Proposals are collected here, discussed, and considered when the next cycle's list of problems is selected and the agenda reassessed.</p>
  <p>A proposal should name the direction, describe the line of inquiry it stands for, explain why it deserves to organize part of the list, and say what kind of near-term problems would trace back to it. Posing a broad direction is credited like posing a problem.</p>
  </div>
  ${items || '<p class="muted" style="text-align:center">No proposals yet.</p>'}
  <h2 class="sec-title">Propose a direction</h2>
  <div class="prose">
  <p>Add an entry to the <code>FUTURE_GOALS</code> list in <code>data/goals.js</code>, with yourself as proposer and today's date, and open a pull request${SITE.contact ? ` or send it to <a href="mailto:${esc(SITE.contact)}">${esc(SITE.contact)}</a>` : ''}:</p>
  <pre>${esc(futureGoalTemplate())}</pre>
  <p class="small muted">Directions adopted for a cycle move to <code>GOALS</code> in the same file and appear on the <a href="#/agenda">agenda</a>.</p>
  </div>`;
}
