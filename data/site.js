/* Site settings. Edit freely; everything here is plain text. */
const SITE = {
  name: "OpenContext",
  subtitle: "Open problems in generalized contextuality",
  byline: "Valuing the ability to pose meaningful scientific questions",
  edition: "OpenContext I",
  description: "OpenContext is a community-curated, open database of precisely stated near-term problems in generalized contextuality, each traceable to a long-term goal of the field's research agenda, with live statuses, recorded partial progress, and fine-grained credit.",
  abstract: "This is a curated list of <strong>original</strong>, well-posed, near-term problems in the subfield of quantum foundations concerned with generalized contextuality. Every question on it is an addition to the existing literature. Each problem is stated precisely enough to be attacked by skilled researchers working with or without AI assistance, motivated within the existing literature, traceable to at least one long-term goal of our starting research agenda, and selected because its resolution would meaningfully advance that goal. Entries carry a live status, a record of partial progress, and the names of everyone who posed, advanced, verified, or explained them.",
  paper: {
    title: "Accelerating research through skilled humans collaborating with AI agents: A case study in quantum foundations",
    authors: "Wagner et al.",
    year: "2026",
    url: ""                       // arXiv link once available, e.g. "https://arxiv.org/abs/2610.xxxxx"
  },
  repo: "https://github.com/rafunds3d/opencontext",   // the GitHub repository, or "" to hide the GitHub links
  contact: "rafael.wagner@uni-ulm.de",                    // email address of the moderators, or ""
  moderators: ["Rafael Wagner", "John H. Selby"],   // the moderation team, in display order
  team: [],                       // everyone who contributed to the list, in display order
  license: "CC BY 4.0",           // license of the entries, or "" to hide
  started: "2026-10-03",          // date the database went live (start of the one-year test)

  /* Submissions. With an endpoint, the Submit page sends entries to the submission service in submit/
     (see README.md, "Submissions"): the sender confirms an institutional e-mail address, and the entry
     arrives as a pull request that a moderator merges to publish. Without one, the Submit page produces
     the entry in the fixed format and an e-mail to the moderators. Institutional addresses are recognised
     from a public list of university domains plus the extra domains below. */
  submit: {
    endpoint: "",                 // e.g. "https://opencontext-submit.your-account.workers.dev"
    extraDomains: ["perimeterinstitute.ca", "oeaw.ac.at", "iqoqi-vienna.at", "mpg.de", "cnrs.fr", "cern.ch", "ictp.it", "icfo.eu", "inl.int", "ist.ac.at", "ucl.ac.uk", "cwi.nl", "weizmann.ac.il"]
  }
};
