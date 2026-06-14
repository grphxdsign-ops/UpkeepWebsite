# Design System: Upkeep Transformation Portal

## 1. Visual Theme & Atmosphere
Upkeep should feel like a cinematic conversion stage, not a SaaS dashboard. The first viewport must show messy paper becoming clean digital records through one memorable visual object. Density is gallery-balanced, variance is asymmetric and bold, motion is fluid and purposeful.

## 2. Color Palette & Roles
- **Paper Field** (#F7F4EA) - Page canvas, faint grid, calm negative space.
- **Charcoal Ink** (#071511) - Primary text and deep device material. Never pure black.
- **Deep Portal Green** (#062018) - Device/stage depth and high-contrast framing.
- **Record Surface** (#FFFDF6) - Screen, documents, and clean prepared records.
- **Ledger Green** (#087546) - Single functional accent for ready states and primary action.
- **Acid Ledger Ribbon** (#D7F32C) - One expressive brand accent for the moving transformation ribbon only.
- **Burnt Paper Ember** (#B65C25) - Cinematic warmth behind the device stage.
- **Soft Rule** (rgba(7,21,17,0.14)) - 1px borders, separators, and structure.

## 3. Typography Rules
- **LOCKED FONT MEMORY:** Upkeep uses Bricolage Grotesque for display and Manrope for body. Future iterations must preserve these unless the user explicitly overrides them.
- **Display:** Bricolage Grotesque, 700-800 weight, huge but controlled, tight line-height, no gradient text.
- **Body:** Manrope, 400-700 weight, relaxed leading, maximum 60 characters per line.
- **Labels:** Manrope 700-900, normal casing when possible. Avoid uppercase eyebrow spam.
- **Banned:** Inter, default system-only premium shortcuts, serif fonts, fake futuristic type.

## 4. Hero Rules
- The hero is a transformation scene: scattered paper, a physical device/portal, scanning state, and clean records emerging.
- No generic dashboard screenshot as the main object.
- Use one dominant physical/artifact composition inspired by Awwwards device scenes: tablet/laptop object, hands or staged silhouette, rich background field.
- The headline is short and emotional. Supporting copy is secondary.
- The first viewport must be visually captivating before it is explanatory.

## 5. Component Styling
- **Buttons:** 8px radius, solid ink or simple outline. No pill overload, no glow.
- **Device Stage:** layered CSS object with bezel, screen, shadows, and internal scan animation.
- **Paper Scraps:** varied rotation, subtle texture, small imperfect shapes.
- **Clean Records:** crisp surfaces, visible hierarchy, minimal fields.
- **Ribbon:** one expressive curved brand element. It must feel integrated into the scene, not pasted on.

## 6. Motion & Interaction
- Use transform and opacity only.
- Perpetual loops: floating paper, subtle ribbon drift, scanner sweep, clean-card breathing.
- Pointer depth may exist only on the main hero object and must be smoothed.
- Reduced motion must disable loops and preserve the static composition.

## 7. Responsive Rules
- No horizontal overflow at any viewport.
- Mobile should crop the device like an editorial product shot, not shrink everything into unreadable UI.
- Nav must not wrap awkwardly; horizontal scroll is acceptable for small widths.
- Hero text must stay readable and never clip.

## 8. Banned AI Tells
- No beige SaaS demo card as the main hero.
- No repeated generic cards pretending to be design.
- No fake charts, KPI tiles, or dashboard filler.
- No explanatory clutter in the first viewport.
- No random glows, generic purple/blue gradients, emoji, or decorative blobs.
- No "beautiful" effects that do not clarify the transformation.
## 9. Reference Knowledge To Retain
- **MNBAQ / Awwwards:** real-world device frame, massive identity, cinematic screen-as-artifact, calm confidence.
- **VOLDOG / Awwwards:** one bold central object, playful ribbon typography, unapologetic high-contrast stage color.
- **Mira / Awwwards:** tablet/device held in a physical scene, floating feature labels, product detail as theatre.
- **Framer Marketplace patterns:** marquee/ribbon motion, scroll carousel behavior, hover depth, staged card reveals.
- **UI UX Pro Max lesson:** design needs a strong composition system before CSS polish. Never start with generic cards.

## 10. Framer Asset Cache
- **Inventory location:** `assets/framer-free/summary.json` and `assets/framer-free/slim-index.json`.
- **Framer Marketplace:** 4,020 public component pages cataloged, with 4,024 exposed `framer.com/m/...` module URLs and 4,023 module files downloaded locally.
- **Framer University:** 623 resource pages cataloged, with 1,044 remix/resource URLs.
- **HyperFramer:** 972 public resources cataloged, with 457 remix URLs and 972 demo URLs.
- **Local preview media:** 1,400 Marketplace preview files downloaded into `assets/framer-free/framer-marketplace/media/`.
- **Usage rule:** Start future visual passes from the slim index's design candidates, then pull specific full catalog records only when a direction needs them.
