# Upkeep Kinetic Wordmark Fidelity Plan

## Source Of Truth

Reference image: `assets/concepts/godly-kinetic.png`

Goal: rebuild the kinetic wordmark direction as live frontend, not as a pasted screenshot.

## Required Layers

1. Dark textured hero stage with subtle grid, grain, vignette, and acid-green glow.
2. Header with book/upload mark, Upkeep wordmark, centered navigation, login, and acid CTA.
3. Left editorial copy:
   - `DOCUMENTS TO DONE`
   - `From paperwork to clean records.`
   - concise supporting line
   - acid primary CTA
   - circular play control
4. Oversized cropped `Upkeep` wordmark behind the product scene.
5. Floating receipt, generated as a realistic raster asset with paper texture, curl, tilt, shadow, and barcode.
6. Animated data flow:
   - curved paths
   - arrowheads
   - drifting numbers
   - scan dust / particle field
7. Right-side record panel:
   - Vendor
   - Date
   - Category pill
   - Total
   - Payment
   - Status
   - Record created confirmation
8. Bottom-left trust row with four proof marks.
9. Bottom-right SOC 2 proof mark.
10. Slow cinematic motion only: no twitchy mouse reaction.

## Implementation Choices

- Typography: keep Bricolage Grotesque and Manrope.
- Receipt: generated bitmap asset, cut out locally from chroma key.
- Record panel: DOM/CSS, not an image.
- Flow lines: SVG with animated dashed strokes and arrow markers.
- Data particles: JavaScript canvas.
- Hero depth: CSS lighting and transforms; Spline only if the receipt/scanner needs true 3D later.
- Micro-icons: inline SVG/CSS now, replaceable with Lottie once the icon set is final.

## Validation Checklist

- Desktop first viewport matches the reference layer inventory.
- Mobile keeps the message, receipt, number flow, and record panel legible.
- No horizontal overflow.
- No console errors.
- Canvas has nonblank animated pixels.
- All required layers are present in DOM or SVG.
- The reference PNG is used only for comparison, never as the live hero.

## Current Project Assets

- Raw generated receipt: `assets/hero/upkeep-receipt-source.png`
- Transparent receipt cutout: `assets/hero/upkeep-receipt-cutout.png`
