# OpenContext

A community-curated, open database of near-term problems in generalized contextuality, each traceable to a long-term goal of the field's research agenda. It is the proof-of-concept database of the perspective *Accelerating research through skilled humans collaborating with AI agents: A case study in quantum foundations*.

This is a simple website specifically designed for the case study, dubbed OpenContext I. Future work will gather new problems for OpenContext II as well as an analysis of organizational (and other) issues.

This website was constructed with substantial help of Fable 5.1.

## Website structure

```
index.html             the page shell: head, header, footer, the apple icon, the list of scripts
assets/style.css       the look: colours and type at the top, then one block per part of the site
data/site.js           name, byline, abstract, companion paper, repository, moderators, license, submission settings
data/goals.js          the research agenda (goals I–III), the status vocabulary, proposals for future broad goals
data/problems.js       one entry per problem — the file you will edit most
data/contributions.js  material attached to entries (claims, partial results, verifications, expositions, …)
data/posts.js          blog posts
pages/home.js          one file per page: each defines a function that returns the page's HTML
pages/problems.js        (the list)        pages/problem.js     (a single problem)
pages/agenda.js          pages/future-goals.js   pages/tags.js   pages/progress.js  (the status timeline)
pages/blog.js            pages/guidelines.js     pages/about.js  pages/contribute.js  pages/submit.js
pages/moderate.js        the moderators' pages: sign-in, the queue of submissions, the Edit form
js/lib.js              shared pieces: apples, status labels, rows, the red and tan boxes, templates, the submission format
js/router.js           turns #/problems, #/problem/3, … into calls of the page functions; loaded last
submit/                the service: a Cloudflare Worker that turns a submission into a pull request and lets moderators edit on the site (see below)
```

## Editing

**On the site (moderators).** With the service in `submit/` deployed, moderators sign in through the *Moderators* link in the footer: a link is e-mailed to an address on the service's moderator list, and the browser then stays signed in for 30 days. Every problem, contribution, post, goal and direction then shows an *Edit* button next to it, which opens a form with the entry's fields, a preview, and a save that is published at once as a commit in the moderator's name (or as a pull request, if the service is set up that way); new entries can be added the same way, and submissions waiting as pull requests are accepted or declined on the Moderation page. Nothing else changes: the files under `data/` stay the source of truth and can still be edited on GitHub. See [`submit/README.md`](submit/README.md), "Moderators".

**A problem or a piece of text, on GitHub.** Edit the file under `data/`. On GitHub, open the file, press the pencil icon, change it, and commit; the site redeploys by itself within a minute or two (watch the *Actions* tab for "pages build and deployment").

**Anything bigger.** Work locally:

```
git clone https://github.com/YOUR-USERNAME/opencontext.git
cd opencontext
# edit files, then double-click index.html (or open it in the browser) to preview
git add -A
git commit -m "Add Problem 4"
git push
```

Use a branch and a pull request for changes you want someone else to look at first; contributors propose problems and progress the same way, and moderators merge.

**A new page.** Create `pages/yourpage.js` with a function `viewYourPage()` that returns HTML (copy `pages/about.js` as a starting point), add a `<script src="pages/yourpage.js">` line to `index.html`, add one line to `route()` in `js/router.js` (`else if (path === 'yourpage') { html = viewYourPage(); title = 'Your page'; nav = 'yourpage'; }`), and add a link `<a href="#/yourpage" data-nav="yourpage">` to the header.

**The look.** Everything visual is in `assets/style.css`. The paper's colours and the fonts are the custom properties at the top of the file.

## Problem entries

Each entry in `data/problems.js` has:

- `number`, `title`, `status` (`open`, `under-revision`, `solved`), `goals` (ids from `data/goals.js`), `topics`;
- `posedBy`, `revisedBy` and `curatedBy` (names; an empty `posedBy` or `revisedBy` shows as "to be recorded"), optionally `ai` (`none`, `partial`, `full`: how much AI assistance went into posing it);
- `statement`, `background`, and, following the curation criteria of the paper's BOX I, `relevance` (how the problem is motivated within the literature and which goals it traces to) and `significance` (how its resolution would advance those goals); an optional `notice` shown as a callout;
- `history`: dated entries of kind `posed`, `status`, `advance`, `interest` or `note`, each with the people involved and an optional link. A `status` entry carries `to: "under-revision"` or `to: "solved"` (or `to: "open"` when a problem is reopened); the newest one sets the date the current status has held since, and together they draw the progress chart. The newest entry of any kind sets "last updated", and the `posed` entry sets the date of the proposal used in the BibTeX citation;
- `references`, each with an optional link.

Keep the line `/* new problems are added above this line */` at the end of the list: the submission service inserts entries there.

## Contributions, posts, directions

Material attached to an entry lives in `data/contributions.js`, one record per contribution in the fixed format of the paper: `problem`, `date`, `kind` (a key of `CONTRIBUTION_KINDS`: `claim`, `partial`, `negative`, `reformulation`, `decomposition`, `evidence`, `verification`, `exposition`, `challenge`, `question`, `comment`), `title`, `material` (the type of material), `ai` (a key of `AI_USE`), `by` (names), `provisional`, `summary`, `url`. The problem page lists them, shows for a problem under revision the date of the claim and the number of verifications and expositions received since, and credits "advanced by", "verified by" and "explained by" from them.

Blog posts live in `data/posts.js` (`slug`, `title`, `date`, `by`, `ai`, `challengeTo` for a challenge to a goal, `problems`, `summary`, `body`). Proposals for broad directions live in `FUTURE_GOALS` in `data/goals.js`. Each list ends with a "new … are added above this line" comment for the same reason as above.

The Contribute page shows copy-paste templates for a problem and for a contribution. Counts, goal pages, topic pages, search, the random problem, "recently updated", the progress chart, the citation text and the JSON export are all generated from the data files.

## Statuses

As in the paper: a problem enters as `open`; a claimed solution places it `under-revision`; it becomes `solved` on a peer-reviewed publication or on independent verification by three researchers, and can return to an earlier status on a substantiated challenge or when the claim is withdrawn. The rules are spelled out on the Guidelines page (`pages/guidelines.js`). Record each change as a dated `status` entry in the problem's history with the new status in `to`, and the Progress page draws the counts over time from those dates.

## Submissions

Researchers submit through the Submit page (`pages/submit.js`), which asks for an institutional e-mail address and the name of at least one human contributor, and records the type of material and the extent of AI use. With `SITE.submit.endpoint` set in `data/site.js`, the form posts to the service in `submit/`: it e-mails a confirmation link, and when the link is opened it appends the entry to the right data file on a new branch and opens a pull request, so that accepting a submission is merging it. A claimed solution also places the problem under revision in the same pull request. Addresses are accepted under `.edu` and the academic suffixes of the Public Suffix List (`ac.uk`, `edu.br`, …), under the `extraDomains` of `data/site.js`, and under the university domains bundled in `submit/domains.js`; the service limits submissions per hour and per address. Submitted text is published as written, with LaTeX and the tags `em`, `strong`, `a`, `code`, `sup`, `sub` and `br`; any other markup is shown literally. Setting the service up takes a free Cloudflare account, a GitHub token and an e-mail sending account; the steps are in [`submit/README.md`](submit/README.md). Without the endpoint, the Submit page produces the entry in the fixed format together with an e-mail to the moderators, who paste it in.

Free-mail providers are refused. An institute that the bundled list lacks goes in `extraDomains` in `data/site.js` (which the Submit page uses to reassure people) and in `EXTRA_DOMAINS` in `submit/wrangler.toml` (which the service uses). The same service signs the moderators in and carries their edits (see "Editing" above): the moderators' addresses are `MODERATOR_EMAILS` in `submit/wrangler.toml`.

## Math

Write math inside `` tex`...` `` strings: inline between `\(` and `\)`, display between `\[` and `\]`, exactly as in LaTeX. A blank line starts a new paragraph. `\ket`, `\bra` and `\braket` are defined; add other macros to the `macros` list in the MathJax configuration at the top of `index.html` (for example `wigner: ['W_{#1}(x,p)', 1]`).

MathJax is loaded from cdnjs and the Computer Modern webfonts from jsDelivr, so an internet connection is needed to see rendered equations and the paper's typeface; without one the page still works, showing raw TeX and Georgia/Times. To make the site fully self-contained, download the `mathjax@3` npm package and copy its `es5/` folder into `assets/mathjax/`, copy the `computer-modern` npm package's CSS files and `fonts/` folder into `assets/fonts/`, and point the `<script>` and `<link>` tags in `index.html` at them.

## Publishing on GitHub Pages

1. Create a public repository (for example `opencontext`) and add these files, either by dragging the whole folder's contents onto the repository page or with `git push`.
2. **Settings → Pages → Build and deployment**: Source *Deploy from a branch*, branch `main`, folder `/ (root)`, Save.
3. After a minute or two the site is at `https://YOUR-USERNAME.github.io/opencontext/`. Set `repo` in `data/site.js` to the repository's URL so the GitHub links and the issue tracker links work; the citation text on each page picks up the live address automatically.

The empty `.nojekyll` file tells GitHub Pages to serve the files as they are.

## The apples

Golden apples mark the long-term goals, red apples the open problems, an outlined apple a problem under revision, and a grey apple a solved one, following the tree in the paper's figures. They are a single inline SVG symbol (`#i-apple`) in `index.html`, recoloured with CSS variables in `assets/style.css`.
