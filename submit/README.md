# The submission service

The site is static, so something has to turn a researcher's submission into a pull request after checking that they own an institutional e-mail address. This folder is that something: a single [Cloudflare Worker](https://workers.cloudflare.com/) (`worker.js`), free to run at this scale, with no server to look after.

## What it does

1. The Submit page posts the form to `POST /submit`. The worker checks the fields, refuses free-mail providers, and accepts the domain if it is under `.edu` or one of the academic suffixes of the Public Suffix List (`ac.uk`, `edu.br`, `ac.jp`, …), under `EXTRA_DOMAINS`, or under a domain of the [public list of university domains](https://github.com/Hipo/university-domains-list) bundled in `domains.js`. It accepts at most ten submissions an hour from one network address and sends at most three confirmation e-mails an hour to one address. The submission is stored for 24 hours and a confirmation link is e-mailed to the address.
2. The researcher opens the link (`GET /verify?t=…`). The worker creates a branch, appends the entry to the right data file (`data/problems.js`, `data/contributions.js`, `data/posts.js` or the `FUTURE_GOALS` list in `data/goals.js`) in the same format as the hand-written entries, opens a pull request labelled `submission`, and sends the browser back to the site with the link to it. A claimed solution also places the problem under revision in the same pull request.
3. A moderator reads the pull request and merges it to accept, edits it first if something needs changing, or closes it to decline. GitHub Pages redeploys the site within a minute or two.

Published entries carry names only; the verified e-mail address appears in the pull request description, so the moderators can reply.

Until the service is deployed, the Submit page still works: it produces the entry in the fixed format together with an e-mail to the moderators, who paste it in by hand.

## Setup, once

You need a free Cloudflare account, a GitHub token, and an e-mail sending account. Everything is run from this folder.

1. **Cloudflare.** Sign up at cloudflare.com, then `npx wrangler login`.
2. **Storage.** `npx wrangler kv namespace create SUBMISSIONS` prints an `id`; paste it into `wrangler.toml` where it says so.
3. **GitHub token.** On GitHub: Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token. Repository access: *Only select repositories*, choose `OpenContext`. Permissions: *Contents* read and write, *Pull requests* read and write (and *Issues* read and write if you want the `submission` label applied; otherwise the label is skipped). Then `npx wrangler secret put GITHUB_TOKEN` and paste it.
4. **E-mail.** The default provider is [Brevo](https://www.brevo.com/) because its free plan only asks you to verify a *sender address*, not a domain. Sign up, verify the address you want the confirmation e-mails to come from (Senders & IP → Senders), create an API key (SMTP & API → API keys), and `npx wrangler secret put MAIL_API_KEY`. Put that sender in `MAIL_FROM` in `wrangler.toml`. If you prefer [Resend](https://resend.com/) and own a domain, set `MAIL_PROVIDER = "resend"` and use an address at your verified domain. If the sending address belongs to a university whose mail policy rejects third-party senders, use an address at a domain you control instead.
5. **Deploy.** `npx wrangler deploy` prints the service's address, something like `https://opencontext-submit.<account>.workers.dev`.
6. **Connect the site.** Put that address in `SITE.submit.endpoint` in `data/site.js` and commit. The Submit page now says "You will receive a link to confirm your address."

Check it with `curl "https://…workers.dev/check?domain=uni-ulm.de"` (expect `"institutional":true`) and by submitting a test comment from your own institutional address; close the pull request it opens.

## Changing it

- Institutions missing from the public list go in `EXTRA_DOMAINS` here and in `SITE.submit.extraDomains` in `data/site.js` (the site uses its copy to reassure people before they submit). `node build-domains.mjs` refreshes `domains.js` from the public list; commit the result.
- Submitted text is published as written, with LaTeX and the tags `em`, `strong`, `a` (http links only), `code`, `sup`, `sub` and `br`; any other markup is shown literally, so a submission cannot run code on visitors' browsers.
- `npm test` (or `node test.mjs`) runs the checks on the pure parts of the worker: validation, the entry format, inserting into the data files, placing a problem under revision. Run it after editing `worker.js` or changing the layout of a data file.
- `npx wrangler dev` runs the service locally; `npx wrangler tail` streams its logs.
- Secrets can be rotated at any time with `npx wrangler secret put`.
