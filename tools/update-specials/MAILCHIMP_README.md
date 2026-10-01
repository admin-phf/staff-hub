# Mailchimp HTML exports — v51

Open Update Specials, load your products, and choose Email. The Mailchimp HTML export panel appears below the product editor. Existing PNG/PDF exports are retained.

- Copy a single product, the current page, or selected products across pages.
- Download page HTML or all active individual/page snippets and product images as ZIP.
- Choose single, 2-Up, 4-Up, Hero + supporting pairs, 6-Up, or compact 3/4 Across layouts.
- Preview desktop or mobile. The preview is the exported HTML.
- The renderer uses live edits, Card text visibility, brand case, short names, product/size options, current prices, promotions, RRP and offer-end dates. Long text is retained and cards grow to fit.

## Images

Enter a public image URL per product. The URL overrides are saved locally on this browser and can be exported/imported as JSON. Optional sheet columns: `mailchimp_image_url` and `mailchimp_image_includes_badge` (yes/no). Local hub images can be resolved to public URLs when the hub runs on HTTPS. Local file/blob/data images become placeholders in HTML. No uploads to Mailchimp happen automatically.

The default HTML badge is a red pill near the image. For the overlapping circular SAVE badge, upload the generated image asset to Mailchimp, paste its URL into the product field, and tick Image already includes the SAVE badge. Re-export the HTML. Regenerate the image whenever the saving changes. Cross-origin restrictions can prevent asset downloads; the ZIP still exports snippets and records failures in its README.

## Mailchimp

Paste each HTML snippet into a full-width Code block. Individual cards omit the terms footer; add terms once per campaign. Page snippets include a footer unless unticked. Keep the Mailchimp unsubscribe and postal-address footer in the email. Uploading a ZIP does not automatically fix hosted image URLs.

Use desktop/mobile previews and send a test email. Tables and inline styles are used; mobile stacking requires the embedded media query. Some clients vary in font rendering, rounded corners and media-query support. Changes to this tool do not publish themselves to GitHub.
