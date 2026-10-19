# The submission and moderation service

The site is static, so something has to turn a researcher's submission into a pull request after checking that they own an institutional e-mail address, and something has to let the moderators edit the site without going through GitHub. This folder is that something: a single [Cloudflare Worker](https://workers.cloudflare.com/) (`worker.js`), free to run at this scale, with no server to look after.

## What it does

1. The Submit page posts the form to `POST /submit`. The worker checks the fields, refuses free-mail providers, and accepts the domain if it is under `.edu` or one of the academic suffixes of the Public Suffix List (`ac.uk`, `edu.br`, `ac.jp`, …), under `EXTRA_DOMAINS`, or under a domain of the [public list of university domains](https://github.com/Hipo/university-domains-list) bundled in `domains.js`. It accepts at most ten submissions an hour from one network address and sends at most three confirmation e-mails an hour to one address. The submission is stored for 24 hours and a confirmation link is e-mailed to the address.
2. The researcher opens the link (`GET /verify?t=…`). The worker creates a branch, appends the entry to the right data file (`data/problems.js`, `data/contributions.js`, `data/posts.js` or the `FUTURE_GOALS` list in `data/goals.js`) in the same format as the hand-written entries, opens a pull request labelled `submission`, and sends the browser back to the site with the link to it. A claimed solution also places the problem under revision in the same pull request.
3. A moderator accepts or declines the pull request on the site's Moderation page (see below), or on GitHub: merging publishes, closing declines, and the pull request can be edited first if something needs changing. GitHub Pages redeploys the site within a minute or two.

Published entries carry names only; the verified e-mail address appears in the pull request description, so the moderators can reply.

Until the service is deployed, the Submit page still works: it produces the entry in the fixed format together with an e-mail to the moderators, who paste it in by hand.

## Moderators

Moderators edit the site where they read it. The *Moderators* link in the footer opens the sign-in: the moderator types their address, the service e-mails a link (valid for 15 minutes), and pressing the button on the page it opens signs that browser in for 30 days. From then on:

- Every problem, contribution, blog post, goal and future direction shows an **Edit** button. It opens a form with the entry's fields as they are in the repository (not as this browser may have cached them; the entry is found by what identifies it, so a public site that is a few minutes behind the repository still opens the right one), with a preview; the standard fields an entry lacks are offered and dropped again if left empty. Changing a problem's status adds a dated history entry, which can be reworded before saving. Saving publishes the change at once as a commit in the moderator's name, and this browser shows it immediately; the public site follows when GitHub Pages redeploys, a minute or two later. If someone else changed the same entry in the meantime, the save is refused and the form has to be reloaded.
- The Moderation page lists the open pull requests: each submission can be shown as it will appear (the entries it adds or changes, rendered), accepted or declined with a note to the submitter. Accepting is a squash merge; when GitHub cannot merge a submission by itself, which happens whenever two submissions added their lines at the same place, the service places the submission's entries on the current files instead, as a commit in the moderator's name, and closes the pull request with a comment saying so. A submission that changes an entry someone else has changed since is left to GitHub. It also lists every entry, with buttons to add a problem, a contribution, a post or a direction.
- Removing an entry takes a second click and is published like any other change.

Set it up by putting the moderators in `MODERATOR_EMAILS` in `wrangler.toml` (`Name <address>` entries separated by commas; the name goes on the commits) and deploying again. `EDIT_MODE = "direct"` commits straight to `GITHUB_BASE`; `EDIT_MODE = "pull-request"` opens a pull request on an `edit/…` branch instead, which another moderator merges (use this if the branch is protected, or if edits should be reviewed). The GitHub token from the setup already has what this needs: *Contents* and *Pull requests*, read and write. To revoke someone's access, remove the address and deploy; their sessions stop working at once.

What moderators write is published as written, like a commit on GitHub, so they are trusted with markup; a stolen moderator session could change the site, which is why sessions end after 30 days and the sign-in link is single-use. Larger changes, the texts of the site itself and the settings in `data/site.js` are still edited on GitHub.

## Setup, once

You need a free Cloudflare account, a GitHub token, and an e-mail sending account. Everything is run from this folder.

1. **Cloudflare.** Sign up at cloudflare.com, then `npx wrangler login`.
2. **Storage.** `npx wrangler kv namespace create SUBMISSIONS` prints an `id`; paste it into `wrangler.toml` where it says so.
3. **GitHub token.** On GitHub: Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token. Repository access: *Only select repositories*, choose `OpenContext`. Permissions: *Contents* read and write, *Pull requests* read and write (and *Issues* read and write if you want the `submission` label applied; otherwise the label is skipped). Then `npx wrangler secret put GITHUB_TOKEN` and paste it.
4. **E-mail.** The default provider is [Brevo](https://www.brevo.com/) because its free plan only asks you to verify a *sender address*, not a domain. Sign up, verify the address you want the confirmation e-mails to come from (Senders & IP → Senders), create an API key (SMTP & API → API keys), and `npx wrangler secret put MAIL_API_KEY`. Put that sender in `MAIL_FROM` in `wrangler.toml`. If you prefer [Resend](https://resend.com/) and own a domain, set `MAIL_PROVIDER = "resend"` and use an address at your verified domain. If the sending address belongs to a university whose mail policy rejects third-party senders, use an address at a domain you control instead.
5. **Deploy.** `npx wrangler deploy` prints the service's address, something like `https://opencontext-submit.<account>.workers.dev`.
6. **Connect the site.** Put that address in `SITE.submit.endpoint` in `data/site.js` and commit. The Submit page now says "You will receive a link to confirm your address", and the Moderators link in the footer leads to the sign-in.

Check it with `curl "https://…workers.dev/check?domain=uni-ulm.de"` (expect `"institutional":true`) and by submitting a test comment from your own institutional address; close the pull request it opens.

## Changing it

- Institutions missing from the public list go in `EXTRA_DOMAINS` here and in `SITE.submit.extraDomains` in `data/site.js` (the site uses its copy to reassure people before they submit). `node build-domains.mjs` refreshes `domains.js` from the public list; commit the result.
- Submitted text is published as written, with LaTeX and the tags `em`, `strong`, `a` (http links only), `code`, `sup`, `sub` and `br`; any other markup is shown literally, so a submission cannot run code on visitors' browsers.
- `npm test` (or `node test.mjs`) runs the checks: validation, the entry format, inserting into the data files, placing a problem under revision, locating and replacing entries, and the whole service (sign-in, edits, the queue) against a fake GitHub. Run it after editing `worker.js` or changing the layout of a data file.
- `npx wrangler dev` runs the service locally; `npx wrangler tail` streams its logs.
- Secrets can be rotated at any time with `npx wrangler secret put`.
