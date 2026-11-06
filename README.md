# PrinTale

PrinTale creates parent-approved personalized storybook previews, including an optional cartoon hero, illustrated book proof, parent PDF proof, and a Peecho sandbox checkout handoff.

## Run locally

From this folder, run:

```powershell
npm start
```

Then visit `http://127.0.0.1:4173/`.

## Peecho sandbox setup

1. Copy `.env.example` to `.env` on the VPS. Keep `.env` out of Git.
2. Create a Peecho **Test** account and collect the API and Secret keys from Settings → API.
3. Choose an active book offering in the Peecho dashboard. Set its offering ID, trim size, and minimum supported page count in `.env`.
4. Keep `PEECHO_ENV=sandbox`. The app creates a secure, expiring Peecho checkout after the parent approves the complete illustrated book.
5. In Peecho Settings → API → Webhooks, set the status URL to `https://printale.cloud/api/peecho/webhook`.

Peecho can retrieve only the randomly named PDF created for that checkout. Parent payment and delivery details stay in Peecho checkout, not PrinTale.

## Production safeguard

Production checkout is deliberately blocked until `PEECHO_PRODUCTION_READY=yes` is set. Before enabling it, validate the final PDF against the selected Peecho offering's trim, bleed, page-count, image-resolution, and spine requirements. The current generated illustrations are suitable for sandbox workflow testing, not an approved production-print specification.
