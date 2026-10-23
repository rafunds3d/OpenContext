# Preprint scan

Every morning a GitHub Actions workflow (`.github/workflows/preprint-scan.yml`) looks through the quant-ph preprints of the last few days on [arXiv](https://arxiv.org) and on [Hexagon](https://hexagonmath.org), cross-lists included, for papers that seem to draw on an OpenContext problem without acknowledging the database or its companion paper. When it finds any, it e-mails a report to the moderators.

**What a report is, and is not.** The scan finds overlap, not use. Two groups working on the same open question will write similar abstracts, cite the same papers and sometimes the same sentences of the literature; the scan cannot see where an idea came from. A report is a reading list for a moderator, ranked by how much each paper overlaps with what is distinctive about an entry, and with the evidence for each. Read the paper, and compare its dates with the entry's, before drawing any conclusion or contacting anyone.

## What it checks

1. **New preprints.** The arXiv API, for papers in or cross-listed to quant-ph first submitted in the last `lookbackDays` days (5, so that weekends and announcement delays are covered), and Hexagon's arXiv-compatible query API for quant-ph. Papers already scanned in an earlier run are skipped.
2. **Abstract screen.** Each title and abstract is compared with each problem in two ways:
   - *Subject and question together.* `profile.json` lists, per problem, phrases for its **subject** (for Problem I, the Wigner entropy and Wigner-positive states) and for the **question** OpenContext asks about it (whether the bound is a noncontextuality inequality). A paper is flagged only when it hits both. Papers on the subject alone are ordinary science and are never reported.
   - *Wording.* The TF-IDF similarity of the abstract to the entry's statement, background, relevance and significance, weighted against the other preprints of the window so that the field's everyday vocabulary counts for little. A paper at or above `similarityThreshold` is flagged even without the phrases.
3. **Acknowledgement.** Flagged papers that mention OpenContext, the site's address, the repository, or the companion paper's title (and its arXiv number, once `SITE.paper.url` in `data/site.js` has it) in the abstract, comments or full text are set aside and listed at the end of the report as acknowledging the database.
4. **Full text.** For up to `maxFullText` flagged papers a day, the LaTeX source (the arXiv e-print, or Hexagon's source API) is checked for references shared with the entry (by arXiv number, DOI, title, or first author and year), for passages of eight or more consecutive words taken from the entry, and for the problem's phrases in the body.
5. **Ranking.** *Strong*: passages reused word for word, or the subject and question together with at least 30% of the entry's references. *Moderate*: subject and question together with some further sign (close wording, or 15% of the references). *Weak*: the rest of what was flagged.

## What it cannot do

- It cannot show that anyone read the site. Overlap with an open question is also what independent work, or work by the people who posed it, looks like.
- It reads quant-ph only (cross-lists included). A paper elsewhere that is not cross-listed is missed; add categories in `profile.json`.
- It sees text, not ideas: a paper that takes a problem's idea in entirely different words, with different references, scores low.
- Papers submitted as PDF only are screened on their abstract; the report says when the full text was not checked.
- It reads each paper once, when first seen, so content added in a later version is missed.
- It looks at preprints, not journals, talks or other databases.
- The phrase lists and thresholds are a first guess. Expect false alarms at first, and tune `profile.json` as reports come in. When a new problem is added, give it phrases there (the checks in `test.mjs` fail until it has them).

## Setup: e-mail

The report goes by e-mail through any SMTP account. Add these as repository secrets (*Settings → Secrets and variables → Actions → New repository secret*):

| secret | value |
| --- | --- |
| `SMTP_SERVER` | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | `465` (the default, SSL) or `587` (STARTTLS) |
| `SMTP_USERNAME` | the account's login |
| `SMTP_PASSWORD` | its password; for Gmail an [app password](https://myaccount.google.com/apppasswords) (needs 2-step verification) |
| `SMTP_FROM` | optional; the sender address, if not the login |

A free Gmail account with an app password works. A university server works too if it accepts logins from outside its network. The recipient is `rafael.wagner@uni-ulm.de` unless the repository variable `SCAN_EMAIL_TO` says otherwise (*Variables* tab; several addresses separated by commas).

Until the secrets are set, a run that finds something keeps the report with the run for seven days (*Actions → Preprint scan → the run → Artifacts*) and fails, so that GitHub e-mails the repository's owner that the run failed. Days with nothing to report send nothing.

**Privacy.** The repository is public, and so are its issues and run logs. The scan therefore writes no names or titles to the log (only counts), opens no issues and commits nothing. The artifact kept when e-mail is not set up can be downloaded by anyone signed in to GitHub, which is one more reason to set the secrets.

## Running it by hand

*Actions → Preprint scan → Run workflow* runs it at once; *days* widens the window, *ids* scores given preprints instead (their scores are then printed to the log). Locally, from the repository root:

```
node scan/test.mjs                                  # offline checks
node scan/scan.mjs --days 7 --verbose               # writes scan-out/report.md and candidates.json
node scan/scan.mjs --ids 2609.13312,hexagon:2609.00126
```

## Files

```
scan.mjs        fetches the preprints and their sources, writes the report
lib.mjs         the pure parts: feeds, archives, text, scoring, the report
profile.json    categories, window, thresholds, acknowledgement patterns, and each problem's phrases
test.mjs        offline checks, including an end-to-end run on canned feeds (test-fetch.mjs)
```
