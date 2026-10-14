# SecureKey template verification

Verified on 12 October 2026 with local headless Chrome and a static HTTP server.

- 36 standalone HTML pages, including 12 dedicated services and 9 unique blog articles.
- 2,016 layout combinations: every page at 14 screen widths, in both themes and both layout directions.
- Zero detected document overflow, visible unexpected element overflow, footer overlap, missing page images, or browser runtime exceptions in the final layout sweep.
- Final HTTP asset requests also passed, including CSS background images and local fonts/icons. The Coming Soon background path was corrected and verified.
- 1,762 passed interaction assertions, including desktop/mobile Home dropdowns and offcanvas opening/closing on every page.
- Verified theme/direction persistence across navigation and reload; English content retains its language in RTL mode.
- Verified contact validation, invalid-field focus, phone input, past-date rejection, scheduling, and the placeholder FormSubmit guard.
- Verified the configured form's absolute thank-you URL while preventing the test request from reaching the external endpoint.
- Verified login, registration, password matching, terms acceptance, recovery modal, newsletter, and launch-notification demo feedback.
- Verified blog search/category query URLs, empty results, current-article share links, smart comparison controls, mobile testimonial movement in both directions, and a stable countdown deadline.
- Static audit passed: one H1 per page, unique titles/descriptions, valid internal destinations/fragments, unique IDs, resolved form/ARIA references, image alternative text, and explicit image dimensions.
- All 94 WebP image files decoded successfully. The final library contains 63 distinct source photographs and 31 responsive card variants. Each variant belongs to the same declared photograph family; it is not presented as a different photograph.
- JavaScript syntax checks passed for all five first-party runtime scripts.

Test scripts and full JSON results are retained alongside the template.

## Alignment and contrast follow-up

The homepage hero highlights now align icons with the first heading line and use two columns at 1024px. Coverage cards share one icon/heading layout, with badges aligned at the bottom of each row. About-page team cards use two columns at 1024px. Subtle badges use theme-aware emphasis colors, readable 14px labels, and wrapping; dark-theme section labels and card icons also use brighter colors.

The alignment follow-up covered 112 combinations on Home 1 and About at all 14 widths, with both themes and directions. Checks covered heading/icon/badge alignment, label contrast, label clipping, and document overflow. The latest site-wide browser report after the image replacement is a complete 2,016-combination sweep of all 36 pages at all 14 widths, in both themes and directions. It passed without layout, runtime, or HTTP asset failures.

## Complete image replacement audit

- Added 24 genuinely new generated photographs: six major-page visuals, twelve dedicated service-detail photos, four separate Home 2 smart-service card photos, and two replacements for similar Home 1 emergency scenes.
- Removed four superseded WebP files and the old inspection collage from the production asset directory.
- Every major page has a different main visual. Home 1 and Home 2 share no source photos. No photograph is used for unrelated services or articles, and no photo repeats inside a page.
- All nine blog article photos are distinct. The listing and its own article retain the same photo as explicitly permitted. Service cards may retain the same photo on listing pages for the exact same service; service-detail main images are now separate.
- Exact file hashes and perceptual checks, including mirrored/flipped views and center crops, screen the entire image directory. Responsive variants are mapped to their original family instead of counted as different photographs. Final photos and every rendered page were also inspected visually.
- The final mapping is retained in `IMAGE-MAPPING.md`; `image-audit-report.json` records the complete inventory, source families, page usages, and audit results. `image-loading-report.json` checks all 36 pages after image decoding. Prompt provenance is documented in the image manifest.

## Limits and deployment setup

The latest Home 1 image update passed the 112-combination targeted audit, including six distinct loaded emergency-card photographs, consistent 16:10 image ratios, aligned headings and action buttons, and no document overflow. All 94 WebP assets passed the static decode and duplicate-file audit. Image provenance is recorded in the asset manifest.

The two licensed stock sources have original dimensions of 3888×2592 and 5516×3421 and are exported for the web at 1920 pixels wide. Generated photographs have native dimensions of 1672×941, 1672×940, 1536×1024, or 1586×992, so generated scenes remain below the brief's native 1920px/4K target. No artificial upscaling or native 4K claim is made for those images. Perceptual-hash candidates are documented in `image-audit-report.json` and were manually reviewed against the contact sheet; each is a distinct composition retained for its specific topic.

The FormSubmit recipient is configured as `clament.iq@outlook.com`, but external email delivery is not configured or tested in this local QA pass. The contact form still requires the published domain to replace the `_next` URL placeholder when JavaScript is unavailable. Login, registration, and recovery remain frontend demos; contact, newsletter, and launch-notification forms submit through FormSubmit, with no subscriber dashboard. Replace business facts, credentials, prices, policy placeholders, contact information, and social profiles before publishing a real business site.

The layout checker treats artwork clipped within SVG viewports and intentionally hidden carousel slides as intentional visual content. Their visible container bounds and document width are still checked. It does not establish a full WCAG certification, real-world locksmith accreditation, or marketplace acceptance.
