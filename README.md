# shedhouse-kit-set-pricing-system

Shed House internal pricing tools, with two separate workflows:

- **Kit-set only**: supply, freight and supply extras.
- **Kit-set + site & build**: supply plus selected slab, site work, erection and other work packages.

The branded Excel workbooks are in `outputs/sh-pricing-v1/`. The browser app source, tests and integration notes are in [`app/`](app/README.md).

The app uses a shared pricing module and schema-versioned SHP JSON exports. Saved quotes are shared across authorised SH users through a hosted D1 database. Unsaved drafts remain browser-local. The two pricing workflows stay separate; actual SHP import mapping remains a future integration step.

To preview the app with Node 22 or later:

```sh
cd app
npm run dev
```

Open the local URL printed by the dev server. Run `npm test` from `app/` to check the pricing calculations against the workbook base prices.
