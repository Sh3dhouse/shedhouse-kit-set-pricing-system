# shedhouse-kit-set-pricing-system

Shed House internal pricing tools, with two separate workflows:

- **Kit-set only**: supply, freight and supply extras.
- **Kit-set + site & build**: supply plus selected slab, site work, erection and other work packages.

The branded Excel workbooks are in `outputs/sh-pricing-v1/`. The browser app source, tests and integration notes are in [`app/`](app/README.md).

The app uses a shared pricing module and schema-versioned SHP JSON exports. Drafts and saved quotes are browser-local; shared storage and the actual SHP import mapping are future integration steps.

To preview the app with Node 22 or later:

```sh
cd app
npm start
```

Open http://127.0.0.1:4173. Run `npm test` from `app/` to check the pricing calculations against the workbook base prices.
