# Grevitywings Enterprise Website

Local rebuild of Grevitywings.com using a Global Enterprise visual direction with the original purple, magenta, and orange brand palette.

## Development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

## Validation

```bash
npm run lint
npx tsc --noEmit
npm run build
node --test tests/rendered-html.test.mjs
```

## Preserved routes

The implementation preserves the original WordPress-style routes under `/index.php/`, including About, Contact, Privacy Policy, Terms and Conditions, Gallery, Career, Our Team, legacy pages, the blog post, all four current job listings, and the older ground-operations job page.

Contact and job-application forms retain their original live Grevitywings endpoints and field names. WhatsApp, Google Maps, YouTube, email, telephone, social, client, gallery, portfolio, and legal links are retained.
