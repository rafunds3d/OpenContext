# OpenContext

A community-curated, open database of near-term problems in generalized contextuality, each traceable to a long-term goal of the field's research agenda. It is the proof-of-concept database of the perspective *Accelerating research through skilled humans collaborating with AI agents: A case study in quantum foundations*, and it is styled after that paper.

The site is plain HTML, CSS and JavaScript with no build step. Open `index.html` in a browser and it runs; push it to GitHub and GitHub Pages serves it.

## Where things live

```
index.html          the page shell: head, header, footer, the apple icon, the list of scripts
assets/style.css    the look: colours and type at the top, then one block per part of the site
data/site.js        name, byline, abstract, companion paper, repository, moderators, license
data/goals.js       the research agenda (goals I–III) and the status vocabulary
data/problems.js    one entry per problem — the file you will edit most
pages/home.js       one file per page: each defines a function that returns the page's HTML
pages/problems.js     (the list)      pages/problem.js  (a single problem)
pages/agenda.js       pages/tags.js   pages/about.js    pages/contribute.js
js/lib.js           shared pieces: apples, status labels, rows, the red and tan boxes, templates
js/router.js        turns #/problems, #/problem/3, … into calls of the page functions; loaded last
```

Scripts are loaded in the order listed in `index.html`: data first, then `js/lib.js`, then the pages, then the router. A new file only needs a `<script>` tag in that list.

## Editing

**A problem or a piece of text.** Edit the file under `data/`. On GitHub, open the file, press the pencil icon, change it, and commit; the site redeploys by itself within a minute or two (watch the *Actions* tab for "pages build and deployment").

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

- `number`, `title`, `status` (`open`, `proved`, `disproved`, `under-revision`, `complete`), `goals` (ids from `data/goals.js`), `topics`;
- `posedBy` and `curatedBy` (names), `statement`, `background`, `motivation`, and an optional `notice` shown as a callout;
- `history`: dated entries of kind `posed`, `status`, `advance`, `interest` or `note`, each with the people involved and an optional link. The newest `status` entry sets the date the current status has held since; the newest entry of any kind sets "last updated";
- `references`, each with an optional link.

The Contribute page of the site shows a copy-paste template for a new entry and for a progress entry. Counts, goal pages, topic pages, search, the random problem, "recently updated", the citation text and the JSON export are all generated from the data files.

## Math

Write math inside `` tex`...` `` strings: inline between `\(` and `\)`, display between `\[` and `\]`, exactly as in LaTeX. A blank line starts a new paragraph. `\ket`, `\bra` and `\braket` are defined; add other macros to the `macros` list in the MathJax configuration at the top of `index.html` (for example `wigner: ['W_{#1}(x,p)', 1]`).

MathJax is loaded from cdnjs and the Computer Modern webfonts from jsDelivr, so an internet connection is needed to see rendered equations and the paper's typeface; without one the page still works, showing raw TeX and Georgia/Times. To make the site fully self-contained, download the `mathjax@3` npm package and copy its `es5/` folder into `assets/mathjax/`, copy the `computer-modern` npm package's CSS files and `fonts/` folder into `assets/fonts/`, and point the `<script>` and `<link>` tags in `index.html` at them.

## Publishing on GitHub Pages

1. Create a public repository (for example `opencontext`) and add these files, either by dragging the whole folder's contents onto the repository page or with `git push`.
2. **Settings → Pages → Build and deployment**: Source *Deploy from a branch*, branch `main`, folder `/ (root)`, Save.
3. After a minute or two the site is at `https://YOUR-USERNAME.github.io/opencontext/`. Set `repo` in `data/site.js` to the repository's URL so the GitHub links and the issue tracker links work; the citation text on each page picks up the live address automatically.

The empty `.nojekyll` file tells GitHub Pages to serve the files as they are.

## The apples

Golden apples mark the long-term goals, red apples the open problems, an outlined apple a problem under revision, and a grey apple a resolved one, following the tree in the paper's figures. They are a single inline SVG symbol (`#i-apple`) in `index.html`, recoloured with CSS variables in `assets/style.css`.
