# Mailchimp export — v52

Choose Email, then click **Mailchimp export** beside the preview download controls. The panel defaults to **Exact appearance · image + HTML**.

## Exact appearance: matching your finished layout

This mode captures the original rendered artwork and crops individual cards from it. It keeps the existing typography, product image, overlapping SAVE circle, offer labels, prices, underlines, colours and spacing. It does not rebuild the card in email HTML.

1. Choose a layout and finish your edits in the hub.
2. Click **Prepare exact images for this page**.
3. Click **PNG** beside a product to download its finished card, or **Download exact page PNG** for the full arrangement. **All snippets + images ZIP** captures all active pages/cards.
4. Upload those full artwork PNGs to Mailchimp Content Studio.
5. For individual cards, paste the hosted URL into **FULL CARD artwork URL from Mailchimp**. For a whole layout, paste into **Full PAGE artwork URL from Mailchimp**. These are separate from product-photo URLs.
6. Click **Copy card**, **Copy selected HTML**, or **Copy this page HTML** and paste into a full-width Mailchimp Code block. You can also use a PNG directly in a Mailchimp Image block.

A local preview PNG is not an email-hosted asset. Exported HTML uses hosted URLs or clearly named placeholders; no base64/blob/file URLs are embedded in email snippets. After changes to prices/text/style, regenerate and upload the PNG, then enter its new URL. A stale artwork warning flags URLs saved before the current edits. URL settings are saved on this browser and can be exported/imported as JSON.

Whole-page export preserves the complete arrangement as one image. On mobile it scales as a whole; individual/selected cards can stack and are generally easier to read. An optional click-through URL links the images to your website. Images carry descriptive alt text, but text and prices inside the PNG cannot be edited in Mailchimp. Keep a shared campaign terms/footer where required, plus Mailchimp’s unsubscribe and postal-address footer.

PNG capture uses the same artwork/export renderer as the existing slide downloads. Source image loading or cross-origin restrictions can affect capture: inspect the finished PNG and the Image safety net panel before uploading.

## Editable HTML alternative

Choose **Editable HTML · text and prices** to retain v51’s table/inline-style renderer, per-product/page/selected HTML exports and public product-image URLs. Email clients can render fonts, spacing and badges differently. Product-photo URL settings are separate from full-card/page artwork URL settings. Optional sheet columns remain `mailchimp_image_url` and `mailchimp_image_includes_badge` (yes/no) for the editable mode.

## Installation

Replace `tools/update-specials/index.html` with the supplied index, and optionally add the guide/changelog beside it. The full ZIP retains the supplied hub files and excludes git history. Publish through your existing GitHub workflow, then refresh the site and confirm v52. Existing PNG/PDF exports remain available.
