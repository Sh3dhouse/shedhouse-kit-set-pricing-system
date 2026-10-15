# Shed House pricing app

Two separate quote workflows share a framework-independent pricing engine:

- `KIT_ONLY`: kit-set supply, freight and supply extras.
- `KIT_PLUS_WORK`: kit-set supply plus selected slab, site, erection and other work packages.

Run with Node 22 or later:

```sh
npm start
npm test
```

Open http://127.0.0.1:4173. The static application is in `dist/`; it has no build step or runtime dependencies. Sites publication is owner-private. Local preview has no authentication and binds only to loopback.

## Pricing and sources

`dist/bases.json` contains historical base costs and markups extracted from the two branded pricing workbooks. These are references, not current supplier prices. `dist/pricing.js` owns calculations, validation and the transfer schema. It reproduces the five source kit selling prices to cents. Kit-set costs are supplied quotes; dimensions do not create a bill of materials or automatically rescale costs.

Blank cost overrides use history. Zero removes a cost. Markup and gross margin use distinct formulas. Work packages use explicit current quantities, costs and markups. The combined subtotal is the sum of rounded kit and work selling prices; GST is then rounded to cents. Selected incomplete work suppresses totals.

## Storage and SHP integration

This version is browser-local. Drafts, quote libraries and confirmations are stored in localStorage under `shedhouse.pricing.v1`. They are not a shared database and do not sync between devices or users. Download a quote backup for recovery. Importing a backup creates a new record and resets confirmations.

The SHP export uses schema `1.0`, the same core field keys as the spreadsheet transfer tabs, and an explicit pricing variant. `details` carries line-level costs, scope, terms and validation issues. Draft exports are labelled `Draft`; null totals mean missing or invalid inputs, never zero. SHP must check `issue_status` before treating a record as issuable. Mapping this contract to SHP's actual import interface remains a future integration task.

Import `calculate`, `transfer`, `newQuote` and `parseBackup` directly from `dist/pricing.js` when embedding in SHP. Replace the local storage adapter and UI shell without changing the core calculation contract. No backend, connector credentials, supplier API, or SHP connection is present in this version.

## Brand

Supplied logo assets are embedded intact. Palette: dark turquoise `#20353C`, construction yellow `#FAA21F`, linen `#F3EBE1`. Work Sans is the approved alternative to Kit Sans and is requested from Google Fonts with Arial/system fallbacks.

## Customer output

The review view prints only the customer proposal, excluding the pricing shell, costs and profit. Printing is enabled after required fields, cost checks and confirmations pass. Use the browser print dialog to save as PDF. Browser-added headers and footers can be disabled in that dialog.
