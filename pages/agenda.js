/* The research agenda: the three long-term goals, each with the problems filed under it.
   Every function here returns an HTML string; helpers and data come from the files loaded before it (see index.html). */

function viewAgenda() {
  return `<h1 class="page-title">Research agenda</h1>
  <div class="prose">
  <p>The starting point of the agenda is a no-go theorem: quantum theory, viewed as an operational probabilistic theory, cannot be described by a generalized noncontextual ontological model. As with any no-go statement, this motivates a closer look at its implications, its precise statement, and its assumptions, and that scrutiny suggests the three directions below. They are deeply intertwined: all fall under the broader question of classical explainability and its failure, and the separation between them is a matter of organization rather than of substance.</p>
  <p>The agenda is not set in stone. It describes existing lines of inquiry, serves primarily to organize the problem list, and is meant to be periodically reassessed, refined, and where necessary restructured by the community that uses it. Anyone may propose a further goal, and a section collecting challenges to the field is planned.</p>
  </div>
  ${GOALS.map(g => `<section id="${g.id}" class="prose">
    <h2 class="sec-title">${apple('apple-goal')} ${g.numeral}. ${esc(g.title)}</h2>
    ${paras(g.description)}
    <h3 class="sub-title">Problems under this goal</h3>
    ${rows(problemsForGoal(g).sort(byNumber), { empty: 'No problems filed under this goal yet.' })}
  </section>`).join('')}`;
}
