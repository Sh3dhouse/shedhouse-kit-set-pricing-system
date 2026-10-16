# SH pricing specification 2.0 — implementation and release notes

Status: isolated implementation on `codex/pricing-spec-v2`. Production has not been deployed or migrated. V1 spreadsheets remain unchanged. The proposed target rates are pending commercial validation, even after software tests pass.

## Agreed commercial rules

- Separate libraries/files: KIT_ONLY (SUPPLY_ONLY), KIT_PLUS_WORK (CUSTOMER_MANAGED or SH_MANAGED).
- Residential selling target: NZD 2,700/m² excluding GST. Garage/shed: NZD 1,200/m². At a 70/30 split the combined target is NZD 2,250/m². Actual proportions determine the weighted target.
- Areas measured to external faces, shared walls at centreline, internal walls included. Total enclosed ground-floor area must reconcile. Mezzanines and outdoor structures are separate.
- Detailed supplier and package quotations determine the SH quote. The area target is a separate budget comparison, not an extra charge. A scope allowance must be replaced by its accepted quotation, never added alongside it.
- Kit supply gross margin defaults to 30%; SH construction/non-kit package gross margin 10%; uncertain SH construction cost contingency 5%. These are gross margins, not markups.
- Package direct cost = quantity × unit cost. Uncertain SH reserve = ROUND(direct cost × contingency,2). SH sale = ROUND((direct cost + reserve) / (1 − margin) − allocated discount,2). Customer-direct sale estimate = ROUND(direct cost,2), with no SH margin, reserve or discount.
- Kit sale = ROUND(sum of supply costs / (1 − kit margin) − kit discount,2). Sum rounded selling lines, then round GST on the SH subtotal. Currency is NZD, default GST 15%.
- Customer-direct work stays outside SH revenue and GST total. Its separate budget is excluding GST; the third party's tax and payment terms apply.
- Internal measures separate kit profit, construction gross profit, reserve and construction profit after reserve. No portal revenue, cost or contribution assumed in V2.
- Combined actual benchmark = (kit sale + comparable SH work + comparable customer-direct work) / (residential + garage area). Complete standard scope, reconciled positive areas and valid inputs are required. Supply only is not comparable. Site-specific work is always excluded. Mezzanine/outdoor work must be marked outside standard comparable scope.
- Supply lines have an explicit standard-scope flag. Excluded unusual freight or extras remain in SH charges but are removed from the benchmark. The comparable portion of kit selling price (including its discount) is allocated in proportion to comparable supply cost.
- Bands on the unrounded combined quotient: below 1950 Pricing review; 1950–2250 Green inclusive; above2250–2500 Black; above2500 Red. Missing scope = Not comparable.

## Standard scope

Residential intended scope: kit/roof/cladding, standard slab, erection, joinery, framing, insulation/linings, defined electrical/plumbing, kitchen/bathroom/laundry, paint/flooring, management and preliminaries. Garage: basic unlined single storey, kit/roof/cladding, standard slab, erection, rainwater goods, defined door allowances, normal delivery and management.

Separate: abnormal ground, earthworks/retaining, engineering/design/surveys/consents/council charges, external services/septic/tanks, premium specifications, unusual freight/access, mezzanines and outdoor structures. Garage fit-out/services/insulation/linings are additional packages. Define quantities/specifications and current prices before validation.

## Authority and snapshots

Server-restricted SH staff: michael@shedhouse.co.nz (existing account/estimator) and michel@shedhouse.co.nz (pricing approver). Only the latter publishes rate versions and approves issues. Existing Site audience is not expanded. Customer/contractor identities cannot use internal quote APIs; external functionality must use separate projected data endpoints before access is granted.

Rate publishing appends versions. Quotes keep a snapshot. Estimator overrides require explanation; approver-only issue enforces readiness on the server. Issuing atomically writes a quote revision, audit record and immutable quote_issues snapshot. Later saving creates a draft revision; it does not rewrite the issued record. Client-provided status/approval metadata is discarded.

The workbook has editable manual approver/date controls and formula protection against accidental edits, not authenticated approval. It is an internal file; only Customer Quote PDF goes to customers. Save a separate issued workbook/PDF revision. App approval is the authoritative authenticated workflow.

Validity is at most 30 calendar days from quote date, capped by earlier supplier or included trade expiry. Expired quotes cannot be newly issued. Validate current supplier/trade pricing, full standard scope, customer information, inclusions/exclusions and terms. Review defaults quarterly or sooner after significant cost changes.

## Compatibility

Unversioned historical quote documents use legacy-pricing.js and retain historical formulas. New documents use calculationVersion 2.0. Backups accept schemas1.0/2.0 but never restore issue authority. SHP transfer schema2.0 preserves existing workflow partitions. Workbook export uses matching top-level field keys; nested rate_set/details document source mappings and still require a real SHP serialization adapter. No automatic Excel/cloud-rate synchronization is claimed: align versioned assumptions before comparison.

## Release procedure

1. Run `npm test`, workbook/app parity tests and production build. Inspect local browser and spreadsheet previews.
2. Commercially validate target rates and allowances against current supplier/trade prices. Software test success does not validate construction prices.
3. Keep new workbooks as V2 copies; V1 originals remain available.
4. When releasing the app, use existing Sites project identity/audience. Apply only the new 0001 migration through normal publishing. Never rewrite applied 0000.
5. Verify local/production roles, default rate publishing and first approved quote after release. No production migration or publication was performed for this implementation.

Native Excel recalculation has not been exercised on this host. Artifact formula evaluation, saved-file error checks and app parity tests are available; perform a native Excel acceptance check before operational rollout.

The local browser preview confirms the 70/30 target and Green actual $2,250/m² example. Named-account hosted approval was not exercised: the portable preview uses a separate test identity, which cannot impersonate the SH approver. Repository/authority tests exercise role enforcement, immutable approval and rate snapshots in an isolated SQLite database. No production test quote was inserted.
