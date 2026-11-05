# StorySpark MVP

Local-only, static StorySpark demonstration for the personalized children’s storybook journey.

## Run locally

From this folder, run:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Then visit `http://127.0.0.1:4173/`.

## Included demo flow

1. Premium landing story and pilot-mystery introduction.
2. Fictional illustrated avatar selection (no child-photo processing).
3. Age band, story tone, optional friend, and adventure choices.
4. Parent preview with a printable line-art coloring page.
5. Local-only print-handoff concept screen with future integration boundaries.

## Deliberate limits

There are no uploads, databases, accounts, PDF jobs, payments, print-provider calls, or deployment configuration. The print page is an architecture-ready placeholder, and all choices exist only in the running browser session.
