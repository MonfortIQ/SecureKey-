# SecureKey Locksmith

A responsive, public-facing HTML template for residential locksmith services and smart lock installation. The project uses HTML5, CSS, Bootstrap 5.3, and JavaScript. There is no framework build step, backend, or admin dashboard.

## Preview

Open `index.html` with your IDE's Live Server, or serve the project locally:

```sh
python -m http.server 5500 --bind 127.0.0.1
```

Visit `http://127.0.0.1:5500/index.html`. A static server is recommended for consistent preference storage and cross-page testing. You can deploy the HTML pages and `assets/` to a static host.

## Pages

There are 37 standalone HTML pages:

- Two distinct homepages: emergency residential locksmith (`index.html`) and smart lock upgrades (`index-2.html`).
- About, services, pricing, blog archive, and contact.
- Twelve individual service pages, each with its own introduction, problems, scope, benefits, process, FAQs, related services, and pricing preview.
- Nine unique blog articles with checklists, related posts, sidebar search/categories, and sharing controls.
- Login, registration, 404, coming soon, and thank you.
- FAQ, privacy information, terms information, and template/image credits.

## Configure contact delivery

In `contact.html`, replace the form action's `YOUR-EMAIL@example.com` with your verified FormSubmit recipient. The placeholder is deliberately blocked by `assets/js/contact.js`, which shows a helpful message instead of posting customer information to an unconfigured destination.

The form includes `_subject`, `_captcha`, `_template`, `_next`, and a honeypot. The `_next` field is converted to an absolute `thank-you.html` URL at submission. Verify the published URL and activate your recipient with FormSubmit before using live submissions. For a deployment without JavaScript, set `_next` to the absolute published success-page URL in the HTML.

When a page is opened directly as a `file://` URL, browser security prevents FormSubmit from receiving the POST. The site keeps the form on the preview page with a setup message; use a local web server or deployed URL to submit it.

Emergency mode hides and disables scheduling. Appointment mode requires a current or future date and a preferred time. Required text, email, and phone fields receive browser validation, visible error messages, and focus on the first invalid control.

## Frontend-only forms

Login, registration, password recovery, newsletters, and launch notifications demonstrate frontend validation. They do not authenticate, store credentials, create accounts, send messages, or add subscribers. Their feedback explains this. Connect your own services before using these forms in production.

Social profile buttons are labeled placeholders and show setup feedback. Replace them with your actual business profile links. Article sharing uses the current article URL. Sharing a localhost URL does not create a publicly accessible article.

## Customize shared layout

Every page contains its complete baked HTML. Edit page-specific content directly in its HTML file; `partials/header.html` and `partials/footer.html` are reference fragments for the shared layout.

- `assets/css/style.css`: base design tokens and reusable components.
- `assets/css/responsive.css` and `rtl.css`: Bootstrap-related responsive/directional rules.
- `assets/css/site-shell.css`: shared design, navigation, footer, typography, and layout corrections.
- `assets/css/contact.css`: contact-specific layout and illustrations.
- `assets/js/theme.js` and `rtl.js`: preference restoration and toggles.
- `assets/js/main.js`: blog filtering, sharing, comparison, mobile testimonial controls, counters, countdown, and back-to-top.
- `assets/js/validation.js`: frontend demo validation.
- `assets/js/contact.js`: scheduling, contact validation, and FormSubmit setup guard.

Theme and direction use `securekey_theme` and `securekey_direction` in local storage. RTL changes the layout while preserving the actual English content language. At 1024px and below, links move into the offcanvas menu. Home 1/Home 2 dropdowns work in both menus. Mobile calling and booking actions stay visible, with footer space reserved below them.

## Assets and demo content

Images, fonts, and Bootstrap Icons are local. No photo CDN is needed for the template to render. The collection contains 61 distinct AI-generated demo photographs, two licensed stock photographs, and 31 responsive card variants. Home 1 and Home 2 share no photographs. All eleven major page visuals and twelve service-detail images are distinct. Blog listing cards may share the featured photograph of their own article, and service listing cards may share the same service photo across listing pages. Responsive sizes represent one photograph, not separate visual content.

Generated sources are 1672×941 (one is 1672×940), 1536×1024, or 1586×992. Card variants are 640 pixels wide. The two licensed stock sources have original dimensions of 3888×2592 and 5516×3421; their WebP exports are 1920 pixels wide. The 94 WebP files total approximately 9.39 MB. Generated photographs remain below the preferred native 2K/4K source target; they have not been upscaled or represented as 4K. Actual dimensions and licenses are recorded in `assets/images/asset-manifest.json` and `assets/images/CREDITS.md`. Prompt provenance is documented in the image manifest.

The complete usage map is `qa-artifacts/IMAGE-MAPPING.md`. The retained reports document exact-byte hashes, perceptual comparisons including mirrored images, homepage separation, semantic reuse checks, unused assets, and missing paths. Review the contact sheet as well: a perceptual hash is a screening tool, not proof of visual difference.

SecureKey is an illustrative brand. Phone numbers, addresses, company history, credentials, statistics, prices, authors, and testimonials are demo content. Replace them with verified business information. Replace the placeholder privacy/terms pages with the policies that actually apply to your business. Smart-lock capabilities depend on the exact product and installation; do not interpret illustrative scenes as branded product endorsements.

Bootstrap and Bootstrap Icons use the MIT license. Outfit and Plus Jakarta Sans use the SIL Open Font License. Upstream license files are included in `assets/fonts/`.

## Verification

Static and visual QA reports are retained in `qa-artifacts/`. They cover page structure, image paths, duplicate-image screening, responsive layouts, navigation, forms, themes, and direction changes.

The complete layout sweep covers 320, 360, 375, 390, 414, 430, 768, 820, 1024, 1280, 1366, 1440, 1600, and 1920 pixels in light/dark themes and LTR/RTL layouts. Interaction checks open and close navigation on every page and exercise search, filter URLs, modal validation, form feedback, preferences, comparison controls, and countdown stability.

External email delivery and authentication are not verified because they are intentionally unconfigured. Passing browser QA does not establish marketplace certification or a real business's licensing, insurance, product support, or legal compliance.
