# Shed House pricing app

## Pricing V2 — isolated implementation

See [PRICING_V2.md](PRICING_V2.md) for agreed rules, migration and rollout instructions. The live Site remains on the earlier version until acceptance checks are complete.

New V2 quotes use residential $2,700/m² and garage $1,200/m² as provisional selling targets excluding GST, with combined-area colour bands. Detailed costs drive the quote; targets are not additional charges. Kitset profit, construction profit/contingency and customer-contracted budgets are separate. Portal revenue is deferred.

Only michel@shedhouse.co.nz can publish defaults and issue authenticated snapshots. Historical documents retain their calculations; their old customer-print path is disabled. New customer output requires V2 approval. The new database migration adds append-only rates and issued snapshots without changing historical records.

The sections below describe the original V1 foundations. V2 rules take precedence for versioned new quotes.

Two separate quote workflows share a framework-independent pricing engine:

- `KIT_ONLY`: kit-set supply, freight and supply extras.
- `KIT_PLUS_WORK`: kit-set supply plus selected slab, site, erection and other work packages.

Run with Node 22 or later:

```sh
npm run dev
npm test
```

Open the local URL printed by the dev server. The static application is in `public/`; it has no build step or runtime dependencies. Sites publication is owner-private. Local preview has no authentication and binds only to loopback.

## Pricing and sources

`public/bases.json` contains historical base costs and markups extracted from the two branded pricing workbooks. These are references, not current supplier prices. `public/pricing.js` owns calculations, validation and the transfer schema. It reproduces the five source kit selling prices to cents. Kit-set costs are supplied quotes; dimensions do not create a bill of materials or automatically rescale costs.

Blank cost overrides use history. Zero removes a cost. Markup and gross margin use distinct formulas. Work packages use explicit current quantities, costs and markups. The combined subtotal is the sum of rounded kit and work selling prices; GST is then rounded to cents. Selected incomplete work suppresses totals.

## Storage and SHP integration

Saved quotes use shared Cloudflare D1 storage behind the private Site access policy. Unsaved drafts stay in localStorage under shedhouse.pricing.v1. The two workflows have separate shared libraries, immutable variant IDs, revision checks, audit history and reversible archives. Device-only saved quotes can be copied into shared storage from the app. See [SHARED_STORAGE.md](SHARED_STORAGE.md) for API, migration and SHP integration details.

SHP exports retain schema 1.0 and their explicit pricing variant. There is no direct SHP connection yet; the same pricing functions and JSON contract remain ready for that integration.

## Brand

Supplied logo assets are embedded intact. Palette: dark turquoise `#20353C`, construction yellow `#FAA21F`, linen `#F3EBE1`. Work Sans is the approved alternative to Kit Sans and is requested from Google Fonts with Arial/system fallbacks.

## Customer output

The review view prints only the customer proposal, excluding the pricing shell, costs and profit. Printing is enabled after required fields, cost checks and confirmations pass. Use the browser print dialog to save as PDF. Browser-added headers and footers can be disabled in that dialog.
