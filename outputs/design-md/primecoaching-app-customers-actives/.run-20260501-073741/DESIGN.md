---
name: "Prime Coaching"
colors:
  primary: "#3D96FF"        # from --primary-700
  secondary: "#1D2939"      # from --gray-800
  tertiary: "#449AFF"       # from --primary-600
  neutral: "#667085"        # from --gray-500
  surface: "#FFFFFF"        # inferred from light theme default
  text: "#1D2939"           # from --gray-800
  text-muted: "#667085"     # from --gray-500
  border: "#D0D5DD"         # from --gray-300
  error: "#DC3741"          # from component-properties button background-color (danger variant)
  success: "#17B26A"        # inferred from Untitled UI palette companion (no green var declared)
  warning: "#F79009"        # from --warning-500
  primary-950: "#081D36"    # from --primary-950
  primary-900: "#12427C"    # from --primary-900
  primary-800: "#2265B5"    # from --primary-800
  primary-500: "#63ABFF"    # from --primary-500
  primary-200: "#B7D8FF"    # from --primary-200
  primary-100: "#E2EFFF"    # from --primary-100
  primary-50: "#F5FAFF"     # from --primary-50
  gray-700: "#344054"       # from --gray-700
  gray-600: "#475467"       # from --gray-600
  gray-400: "#98A2B3"       # from --gray-400
  gray-200: "#EAECF0"       # from --gray-200
  gray-100: "#F2F4F7"       # from --gray-100
  gray-50: "#F9FAFB"        # from --gray-50

typography:
  display-hero:
    fontFamily: "Inter, sans-serif"   # from @font-face family Inter
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: "1.15"
    letterSpacing: "-0.02em"
  display-large:
    fontFamily: "Inter, sans-serif"   # from @font-face family Inter
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: "1.2"
    letterSpacing: "-0.01em"
  section-heading:
    fontFamily: "Inter, sans-serif"   # from @font-face family Inter
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: "1.25"
    letterSpacing: "-0.005em"
  subheading-large:
    fontFamily: "Inter, sans-serif"   # from @font-face family Inter
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: "1.3"
    letterSpacing: "0em"
  subheading:
    fontFamily: "Inter, sans-serif"   # from @font-face family Inter
    fontSize: "1.25rem"
    fontWeight: 500
    lineHeight: "1.4"
    letterSpacing: "0em"
  body-large:
    fontFamily: "Inter, sans-serif"   # from @font-face family Inter
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: "1.6"
    letterSpacing: "0em"
  body:
    fontFamily: "Inter, sans-serif"   # from @font-face family Inter
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5"
    letterSpacing: "0em"
  body-small:
    fontFamily: "Inter, sans-serif"   # from @font-face family Inter
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.5"
    letterSpacing: "0em"
  button:
    fontFamily: "Inter, sans-serif"   # from @font-face family Inter
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: "1.5"
    letterSpacing: "0em"
  button-small:
    fontFamily: "Inter, sans-serif"   # from @font-face family Inter
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.5"
    letterSpacing: "0em"
  label:
    fontFamily: "Inter, sans-serif"   # from component-properties label font-size 1.125em
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: "1.4"
    letterSpacing: "0em"
  caption:
    fontFamily: "Inter, sans-serif"   # from @font-face family Inter
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: "1.4"
    letterSpacing: "0em"
  caption-small:
    fontFamily: "Inter, sans-serif"   # from @font-face family Inter
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "1.4"
    letterSpacing: "0em"
  # Aliases for backward compat
  h1:
    fontFamily: "Inter, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: "1.15"
    letterSpacing: "-0.02em"
  h2:
    fontFamily: "Inter, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: "1.2"
    letterSpacing: "-0.01em"
  h3:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: "1.25"
    letterSpacing: "-0.005em"
  h4:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: "1.3"
    letterSpacing: "0em"
  body-lg:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: "1.6"
    letterSpacing: "0em"
  body-md:
    fontFamily: "Inter, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5"
    letterSpacing: "0em"
  body-sm:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.5"
    letterSpacing: "0em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, monospace"   # inferred from Tailwind defaults (no monospace @font-face declared)
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.5"
    letterSpacing: "0em"

rounded:
  none: "0px"
  sm: "2px"
  md: "4px"    # from component-properties button border-radius .25em (≈4px)
  lg: "8px"
  full: "9999px"

spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"

preview_tokens:
  button_primary_bg: "#3D96FF"
  button_primary_text: "#ffffff"
  button_primary_border: "#3D96FF"
  button_secondary_bg: "transparent"
  button_secondary_text: "#3D96FF"
  button_secondary_border: "#3D96FF"
  button_tertiary_text: "#3D96FF"
  surface_bg: "#ffffff"
  card_bg: "#F9FAFB"
  text: "#1D2939"
  text_muted: "#667085"
  border: "#D0D5DD"
  accent: "#3D96FF"
  button_radius: "4px"
  card_radius: "8px"
  input_radius: "3px"

components:
  button-primary:
    bg: "#3D96FF"
    text: "#ffffff"
    border: "#3D96FF"
    radius: "4px"
    padding: "10px 18px"
    font: "16px Inter weight 500"
    hover_bg: "#2265B5"
  button-secondary:
    bg: "transparent"
    text: "#3D96FF"
    border: "#3D96FF"
    radius: "4px"
    padding: "10px 18px"
    font: "16px Inter weight 500"
    hover_bg: "#F5FAFF"
  button-ghost:
    bg: "transparent"
    text: "#344054"
    border: "transparent"
    radius: "4px"
    padding: "10px 18px"
    font: "16px Inter weight 500"
  card:
    bg: "#ffffff"
    border: "#EAECF0"
    radius: "8px"
    shadow: "0 1px 3px rgba(16,24,40,0.1), 0 1px 2px rgba(16,24,40,0.06)"
    padding: "24px"
  input-text:
    bg: "#ffffff"
    text: "#1D2939"
    border: "#D0D5DD"
    radius: "3px"
    padding: "10px 12px"
    focus_border: "#3D96FF"
  badge-default:
    bg: "#F2F4F7"
    text: "#344054"
    border: "#EAECF0"
    radius: "4px"
    padding: "2px 8px"
    font: "12px Inter weight 500"
  badge-primary:
    bg: "#E2EFFF"
    text: "#12427C"
    border: "#B7D8FF"
    radius: "4px"
    padding: "2px 8px"
    font: "12px Inter weight 500"
  nav-header:
    bg: "#ffffff"
    text: "#1D2939"
    border_bottom: "#EAECF0"
    backdrop_filter: "none"
    height: "64px"
---

## 1. Visual Theme & Atmosphere

Prime Coaching presents a clean, professional SaaS aesthetic grounded in a blue-centric identity palette built on a meticulous 12-step primary scale. The brand leans into clarity and trust — the hallmarks of a Brazilian coaching platform serving clients who expect organized, data-driven dashboards. Whites are pure, surfaces are minimal, and blue anchors every interactive moment without overwhelming the whitespace.

The typography system relies exclusively on Inter, shipped in nine weights (100–900) via self-hosted `.ttf` files. This commitment to the full weight range is deliberate: it enables fine-grained typographic hierarchy — ultra-light captions alongside semibold headings — without introducing a second typeface. The result is a monofamilial stack that feels systematic and enterprise-grade.

Surface treatment is flat with targeted elevation. Cards lift softly using neutral-tinted shadows (`rgba(16,24,40,0.1)`), while the page background remains pure white. There is no glassmorphism and no gradient wash. Depth is communicated through border + surface contrast, keeping the visual language grounded and legible.

The single most distinctive design choice is the exhaustive primary scale — twelve named steps from `#081D36` (near-black navy) through `#FBFDFF` (near-white tint). This engineering of the blue ramp signals an intent to use blue not only for CTAs but for status indicators, focus rings, selected states, and tonal backgrounds — a deliberate system rather than a single accent color.

**Key Characteristics:**
- Monofamilial Inter typography across all nine weights
- 12-step blue primary scale from deep navy (#081D36) to near-white (#FBFDFF)
- Flat surface treatment — depth via border contrast, not heavy shadows
- Pure white (#ffffff) base surfaces with gray-50 card backgrounds
- Untitled UI–inspired gray scale (recognizable #667085 midtone)
- Warning amber (#F79009) as the sole warm accent
- Polaris-friendly optimism: generous whitespace, rounded-but-restrained corners (4px)
- Light mode canonical with no dark theme declared in the CSS

---

## 2. Color Palette & Roles

### Primary

- **Prime Blue 700** (`#3D96FF`): `--primary-700`. Primary CTA background, focus rings, links, active states.
- **Prime Blue 600** (`#449AFF`): `--primary-600`. Hover state for primary buttons, slightly lighter action color.
- **Prime Blue 800** (`#2265B5`): `--primary-800`. Pressed/active state for buttons, darker interactive variant.
- **Prime Blue 900** (`#12427C`): `--primary-900`. Deep blue for high-contrast text on light backgrounds.
- **Prime Blue 950** (`#081D36`): `--primary-950`. Near-black navy for brand-immersive dark sections.

### Brand & Dark

- **Dark Navy** (`#1D2939`): `--gray-800`. Primary heading and body text color. The brand's dark anchor.
- **Navy 700** (`#344054`): `--gray-700`. Secondary text, dark UI labels.

### Accent Colors

- **Warning Amber** (`#F79009`): `--warning-500`. Warning states, attention indicators.
- **Warning Orange** (`#DC6803`): `--warning-600`. Warning text on light backgrounds.
- **Primary Tint** (`#E2EFFF`): `--primary-100`. Badge backgrounds, selected row fills, tonal chips.
- **Primary Pale** (`#F5FAFF`): `--primary-50`. Hover state background for ghost buttons, subtle highlights.

### Interactive

- **Focus Blue** (`#3D96FF`): CTA click target, focus ring. Shadow expressed as `0 0 0 3px rgba(61,150,255,0.5)` (transparent ring + colored ring).
- **Danger Red** (`#DC3741`): Destructive button variant, form validation error inline UI. Detected from SweetAlert integration in component-properties.

### Neutral Scale

- **Gray 800** (`#1D2939`): `--gray-800`. Heading text.
- **Gray 700** (`#344054`): `--gray-700`. Body text, labels.
- **Gray 600** (`#475467`): `--gray-600`. Secondary body text.
- **Gray 500** (`#667085`): `--gray-500`. Muted/help text, placeholder.
- **Gray 400** (`#98A2B3`): `--gray-400`. Disabled states, placeholder icons.
- **Gray 300** (`#D0D5DD`): `--gray-300`. Default border color for inputs and cards.
- **Gray 200** (`#EAECF0`): `--gray-200`. Dividers, table row borders.
- **Gray 100** (`#F2F4F7`): `--gray-100`. Subtle background tints, badge fills.
- **Gray 50** (`#F9FAFB`): `--gray-50`. Card/panel backgrounds.
- **Gray 25** (`#FCFCFD`): `--gray-25`. Near-white alternate surface.

### Surface & Borders

- **White** (`#FFFFFF`): Page background, card inner surface.
- **Gray 50** (`#F9FAFB`): Elevated panel, table alternating row.
- **Gray 300** (`#D0D5DD`): Default input and card border.
- **Gray 200** (`#EAECF0`): Hairline dividers, nav bottom border.

### Shadow Colors

Shadows use neutral dark at low opacity: `rgba(16,24,40,0.1)` and `rgba(16,24,40,0.06)` — no blue tinting in the elevation system.

### Color Philosophy

Prime Coaching's palette is built on functional clarity rather than expressive boldness. The blue primary scale is extensive by design — it provides every intermediate step needed for hover, focus, selected, and tonal backgrounds without introducing secondary hue families. The gray scale mirrors the Untitled UI system's distinctive warm-neutral grays, providing a sophisticated dark anchor (`#1D2939`) while keeping body text (`#667085`) distinctly lighter. The sole warm intruder is the warning amber ramp, reserved strictly for cautionary states. This restraint in warm colors ensures the blue brand identity reads cleanly against white surfaces without competing chroma.

---

## 3. Typography Rules

### Font Family

- **Primary:** `Inter` — self-hosted via `@font-face`, nine weights 100–900, `font-display: swap`. No italic variants declared; the system uses weight alone for hierarchy.
- **Monospace:** `ui-monospace, SFMono-Regular, monospace` — Tailwind's default monospace stack. No self-hosted monospace font declared.
- **No OpenType features** declared explicitly in the CSS (no `font-feature-settings`). Standard Inter OpenType features apply by browser default.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| display-hero | Inter | 3rem (48px) | 700 | 1.15 | -0.02em | Hero headlines |
| display-large | Inter | 2.25rem (36px) | 700 | 1.2 | -0.01em | Section hero headers |
| section-heading | Inter | 1.875rem (30px) | 600 | 1.25 | -0.005em | Page section titles |
| subheading-large | Inter | 1.5rem (24px) | 600 | 1.3 | 0em | Card group headings |
| subheading | Inter | 1.25rem (20px) | 500 | 1.4 | 0em | Widget titles |
| body-large | Inter | 1.125rem (18px) | 400 | 1.6 | 0em | Lead text, intro paragraphs |
| body | Inter | 1rem (16px) | 400 | 1.5 | 0em | Default body copy |
| body-small | Inter | 0.875rem (14px) | 400 | 1.5 | 0em | Secondary body, table cells |
| label | Inter | 1.125rem (18px) | 500 | 1.4 | 0em | Form labels (from component-properties 1.125em) |
| button | Inter | 1rem (16px) | 500 | 1.5 | 0em | Primary button copy |
| button-small | Inter | 0.875rem (14px) | 500 | 1.5 | 0em | Secondary/compact buttons |
| caption | Inter | 0.8125rem (13px) | 400 | 1.4 | 0em | Help text, tooltips |
| caption-small | Inter | 0.75rem (12px) | 400 | 1.4 | 0em | Fine print, timestamps |

### Principles

- **Inter weight 700 is reserved for display headings only** — using 700 weight at body scale breaks the visual hierarchy, which relies on size + weight contrast together.
- **Weight 500 signals interactivity** — buttons, labels, nav items, and active states use 500 to distinguish them from static 400 content without reaching for bold.
- **Tight tracking at large sizes** — display text pulls tracking to -0.02em to counter Inter's slightly open spacing at 48px+; never apply positive tracking to display-hero text.
- **No italic variant is declared** — the design system does not use italic for emphasis; rely on weight contrast (400 → 500) or color contrast instead.
- **18px label matches field font-size** — form labels at 1.125em mirror the input font-size, creating visual alignment between label and field across the form layout.

---

## 4. Components

### Buttons

**Primary Blue** (`button-primary`)
- Background: `#3D96FF`
- Text: `#ffffff`
- Border: `#3D96FF` (1px solid)
- Padding: 10px 18px
- Radius: 4px
- Font: 16px Inter weight 500
- Hover: `#2265B5` background
- Use: Primary form submissions ("Entrar"), key CTAs

**Secondary Outlined** (`button-secondary`)
- Background: `transparent`
- Text: `#3D96FF`
- Border: `#3D96FF` (1px solid)
- Padding: 10px 18px
- Radius: 4px
- Font: 16px Inter weight 500
- Hover: `#F5FAFF` background fill
- Use: Secondary actions, cancel-type interactions

**Ghost / Text** (`button-ghost`)
- Background: `transparent`
- Text: `#344054`
- Border: `transparent`
- Padding: 10px 18px
- Radius: 4px
- Font: 16px Inter weight 500
- Use: Tertiary actions, navigation-level links styled as buttons

> **Note:** The CSS also includes a SweetAlert2 button (`#7066e0` purple) and a danger variant (`#dc3741` red) for destructive confirmations. These are modal-specific UI patterns, not general brand button styles. Do not use `#7066e0` for application-level CTAs.

### Cards & Containers

**Default Card** (`card`)
- Background: `#ffffff`
- Border: `#EAECF0` (1px solid, `--gray-200`)
- Radius: 8px
- Shadow: `0 1px 3px rgba(16,24,40,0.1), 0 1px 2px rgba(16,24,40,0.06)`
- Padding: 24px
- Use: Dashboard panels, data groups, customer detail views

### Inputs & Forms

**Text Input** (`input-text`)
- Background: `#ffffff`
- Text: `#1D2939`
- Placeholder: `#9ca3af` (detected in component-properties)
- Border: `#D0D5DD` (1px solid, `--gray-300`)
- Radius: 3px (`.1875em` from component-properties)
- Padding: 10px 12px (`0 .75em` detected)
- Font-size: 18px (1.125em from component-properties)
- Focus border: `#3D96FF`
- Focus ring: `inset 0 1px 1px rgba(0,0,0,.06), 0 0 0 3px rgba(100,150,200,.5)`
- Transition: `border-color 0.1s, box-shadow 0.1s`

> **Form context:** This is a login/authentication surface — field labels sit above inputs at 1.125em Inter weight 500, inputs have no background fill (transparent is the most common detection, rendered as white via page bg). The "Mantenha-me conectado" checkbox pattern uses default browser styling.

### Badges / Tags / Pills

**Default Badge** (`badge-default`)
- Background: `#F2F4F7` (`--gray-100`)
- Text: `#344054` (`--gray-700`)
- Border: `#EAECF0` (`--gray-200`)
- Radius: 4px
- Padding: 2px 8px
- Font: 12px Inter weight 500
- Use: Status labels, category tags, count chips

**Primary Badge** (`badge-primary`)
- Background: `#E2EFFF` (`--primary-100`)
- Text: `#12427C` (`--primary-900`)
- Border: `#B7D8FF` (`--primary-200`)
- Radius: 4px
- Padding: 2px 8px
- Font: 12px Inter weight 500
- Use: Active/selected status, plan-tier indicators

### Navigation

**Header Nav** (`nav-header`)
- Background: `#ffffff`
- Text: `#1D2939`
- Bottom border: `#EAECF0` (1px)
- Height: 64px
- No backdrop blur — the system uses solid surfaces exclusively
- Use: Top application navigation bar

### Decorative Elements

No dashed borders, gradient accents, or decorative motifs are declared in the CSS beyond the button focus ring (`0 0 0 3px rgba(...)`) and SweetAlert2 animated success/error circles. The visual language is intentionally utilitarian — decoration comes from layout rhythm and color, not ornament.

---

## 5. Layout Principles

### Spacing System

Base unit: 4px (Tailwind default). Scale follows powers of 2 from 4px:

- **xs:** 4px — tight internal padding, icon gaps
- **sm:** 8px — compact component padding, input inline gaps
- **md:** 16px — standard section padding, form field spacing
- **lg:** 24px — card padding, section vertical rhythm
- **xl:** 32px — between major content blocks
- **xxl:** 48px — hero sections, above-the-fold breathing room

### Grid & Container

The stack is Tailwind CSS v3.4, which defaults to a fluid grid with responsive breakpoint containers. Expected max-width pattern: `max-w-7xl` (1280px) for main dashboard content. The login page centers content using flex — a single-column centered layout with a two-panel split (form left, illustration right) at desktop.

### Whitespace Philosophy

Prime Coaching's layout generosity reflects its target audience — busy coaches and business owners who need visual breathing room to process customer data at a glance. Internal card padding is set at 24px, which is characteristic of the Untitled UI/Polaris family: spacious enough to feel premium, tight enough to fit a data-dense dashboard without scrolling fatigue. White space is used structurally (separating logical groups) rather than decoratively.

### Border Radius Scale

- **0px (none):** Hard edges, not used in standard UI
- **2px (sm):** Smallest interactive chips
- **3px:** Input fields (`.1875em` from component-properties)
- **4px (md):** Buttons (`.25em`), badges, standard interactive elements
- **8px (lg):** Cards, panels, modals
- **9999px (full):** Pill shapes for avatars, tag variants

---

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | `border: 1px solid #EAECF0` | Dividers, table rows, form sections |
| Ambient | `box-shadow: 0 1px 2px rgba(16,24,40,0.06)` | Subtle card lift |
| Standard | `0 1px 3px rgba(16,24,40,0.1), 0 1px 2px rgba(16,24,40,0.06)` | Default cards, panels |
| Elevated | `0 4px 8px rgba(16,24,40,0.1), 0 2px 4px rgba(16,24,40,0.06)` | Dropdowns, popovers |
| Deep (modal) | `0 0 1px rgba(0,0,0,.075), 0 1px 2px rgba(0,0,0,.075), 1px 2px 4px rgba(0,0,0,.075), 1px 3px 8px rgba(0,0,0,.075), 2px 4px 16px rgba(0,0,0,.075)` | SweetAlert2 modals |
| Ring (focus) | `0 0 0 3px rgba(100,150,200,.5)` | Input/button focus ring |

### Shadow Philosophy

The shadow system is intentionally low-chromatic — all shadows use near-neutral dark (`rgba(16,24,40,...)` or `rgba(0,0,0,...)`) with no blue tinting. This is a departure from many blue-primary systems that echo the brand hue into shadows. Prime Coaching's approach keeps depth perception neutral, allowing the blue primary color to read as a distinct interactive signal rather than blending into elevation. Depth is hierarchy; color is action.

---

## 7. Do's and Don'ts

**Do's:**
- ✅ Use Inter weight 700 (`#1D2939`) for display headings — the dark navy at large sizes is the brand's primary typographic statement
- ✅ Use `#3D96FF` (--primary-700) for all primary CTAs and focus rings — this is the only blue shade cleared for interactive elements at full saturation
- ✅ Use `#E2EFFF` (--primary-100) as the tonal background for selected/active table rows — it pairs directly with the primary-900 text (#12427C) for accessible contrast
- ✅ Apply shadow `0 1px 3px rgba(16,24,40,0.1)` to cards — this is the brand's canonical elevation; heavier shadows feel foreign
- ✅ Use input font-size at 1.125em (18px) — matching label font-size; mismatching these two creates visual tension in dense form layouts
- ✅ Use Inter weight 500 for button copy, form labels, and nav items — the 400→500 weight shift is the primary emphasis mechanism in this system

**Don'ts:**
- ❌ Don't use `#7066e0` (SweetAlert's purple) for branded buttons — it is injected by the third-party modal library and has no relationship to Prime Coaching's primary blue
- ❌ Don't add backdrop-blur or glassmorphism effects — the system uses solid white surfaces exclusively; glass layers break the flat-with-borders visual contract
- ❌ Don't use `#FFBBD3` (--primary-300, anomalous pink step in the blue scale) for interactive UI — it appears in the palette as a possible placeholder or legacy artifact; no semantic role is assigned to it
- ❌ Don't apply letter-spacing to Inter at body sizes (14–18px) — the font is calibrated for zero tracking at these scales; positive letter-spacing creates a "stretched" effect foreign to the brand
- ❌ Don't use weight 700 for buttons or form labels — 500 is the brand's interactive weight; 700 at small sizes reads as aggressive and breaks the hierarchy contract with display headings
- ❌ Don't use `rgba()` or `hsl()` in color token declarations — the pipeline expects resolved 6-digit hex; use the named scale steps (`--primary-700: #3D96FF`) and convert before emitting
- ❌ Don't round card corners beyond 8px — the system stays in the 3–8px range for containers; pill-shaped cards or 16px+ radii read as a consumer mobile style foreign to this SaaS dashboard

---

## 8. Responsive Behavior

### Breakpoints

Tailwind CSS v3.4 default breakpoints apply:

| Name | Width | Key Changes |
|------|-------|-------------|
| xs (default) | 0px | Single column, stacked form, mobile nav |
| sm | 640px | Minor layout adjustments, spacing scale up |
| md | 768px | Two-column form layout begins |
| lg | 1024px | Full dashboard layout, sidebar nav appears |
| xl | 1280px | Max content width (`max-w-7xl`) reached |
| 2xl | 1536px | No further layout changes; whitespace grows |

### Touch Targets

Minimum interactive target: 44×44px per WCAG 2.1 AA. Button padding of 10px 18px at 16px font produces a minimum height of ~44px. Input height at 1.125em font + 10px vertical padding produces ~40px — marginally below; consider 12px vertical padding on mobile to ensure 44px.

### Collapsing Strategy

- **Navigation:** Top header nav collapses to hamburger at `md` breakpoint
- **Typography:** Display sizes downscale one step (3rem hero → 2.25rem at mobile)
- **Cards:** Full-width on mobile (no side-by-side cards below `lg`)
- **Forms:** Full-width inputs on all breakpoints (the login form is already single-column)
- **Spacing:** `lg` padding (24px) reduces to `md` (16px) inside cards on `sm` breakpoint

### Image Behavior

Decorative images (`/assets/images/key.png`, `/assets/images/icon.png`) hide or stack below the form on mobile. The two-panel login (illustration + form) collapses to form-only on narrow screens.

---

## 9. Agent Prompt Guide

### Quick Color Reference

- Primary CTA: Prime Blue (`#3D96FF`)
- CTA Hover: Deep Blue (`#2265B5`)
- CTA Active/Pressed: Navy (`#12427C`)
- Background: White (`#ffffff`)
- Card Surface: Gray 50 (`#F9FAFB`)
- Heading text: Dark Navy (`#1D2939`)
- Body text: Navy Gray (`#344054`)
- Muted text: Gray 500 (`#667085`)
- Placeholder: Gray 400 (`#98A2B3`)
- Default border: Gray 300 (`#D0D5DD`)
- Divider: Gray 200 (`#EAECF0`)
- Focus ring: Blue tint (`rgba(100,150,200,0.5)`)
- Selected fill: Primary 100 (`#E2EFFF`)
- Badge text on selected: Primary 900 (`#12427C`)
- Warning: Amber (`#F79009`)
- Error/Danger: Red (`#DC3741`)

### Example Component Prompts

> "Create a login form centered on white (#ffffff) background. Form container is a card: white bg, 1px solid #EAECF0 border, 8px radius, 24px padding, shadow `0 1px 3px rgba(16,24,40,0.1)`. Heading 'Acesse a plataforma' at 30px Inter weight 600, color #1D2939. Labels at 18px Inter weight 500, color #344054. Inputs: white bg, 1px solid #D0D5DD border, 3px radius, 10px 12px padding, 18px Inter, focus border #3D96FF + ring `0 0 0 3px rgba(100,150,200,0.5)`. Submit button: #3D96FF bg, white text, 4px radius, 10px 18px padding, 16px Inter weight 500, hover #2265B5."

> "Create a customer data table on white background with Inter 14px weight 400 (#344054). Table header: #F9FAFB bg, 12px Inter weight 500 (#667085), uppercase. Row border-bottom: 1px solid #EAECF0. Active row: #E2EFFF bg with #12427C text. Status badge for 'Ativo': #E2EFFF bg, #12427C text, 1px solid #B7D8FF border, 4px radius, 2px 8px padding, 12px Inter weight 500."

> "Build a top navigation bar on #ffffff background, 64px tall, bottom border 1px solid #EAECF0. Logo on left. Nav links at 14px Inter weight 500, color #344054, active link color #3D96FF with a 2px bottom underline #3D96FF. Right-side: avatar circle (32px, #E2EFFF bg, initials in #12427C, Inter 14px weight 600) plus a primary button (#3D96FF, white text, 4px radius, 8px 16px padding)."

> "Create a stats card for a coaching dashboard. Card: white bg, 1px solid #EAECF0 border, 8px radius, 24px padding, shadow `0 1px 3px rgba(16,24,40,0.1)`. Title: 12px Inter weight 500 #667085 uppercase. Value: 36px Inter weight 700 #1D2939, letter-spacing -0.01em. Trend badge: #E2EFFF bg, #12427C text, 4px radius, 2px 8px padding, 12px Inter weight 500."

> "Create a modal dialog on a white overlay. Modal: white bg, 8px radius, shadow `0 0 1px rgba(0,0,0,.075), 0 1px 2px rgba(0,0,0,.075), 1px 2px 4px rgba(0,0,0,.075), 1px 3px 8px rgba(0,0,0,.075), 2px 4px 16px rgba(0,0,0,.075)`, 24px padding. Title: 20px Inter weight 600 #1D2939. Body: 14px Inter weight 400 #475467. Footer: primary button (#3D96FF) + ghost button (transparent, #344054 text). Destructive confirm uses #DC3741 primary button."

### Iteration Guide

1. **Blue primary scale is continuous** — `--primary-700` (#3D96FF) is the action blue; `--primary-800` (#2265B5) is hover; `--primary-100` (#E2EFFF) is the tonal fill; `--primary-900` (#12427C) is text on tonal fill. Do not mix these roles.
2. **Heading weight 700, interactive weight 500, body weight 400** — this three-level weight system is the entire emphasis mechanism. Never use weight 600 for body text or weight 400 for buttons.
3. **Input radius is 3px, button radius is 4px, card radius is 8px** — do not unify these to a single value; the stepped rounding creates visual component hierarchy.
4. **Shadows are neutral, never blue-tinted** — use `rgba(16,24,40,0.1)` for standard elevation. If you see blue-tinted shadows in a reference, they do not belong here.
5. **The warning amber (#F79009) is the only warm color** — do not introduce orange, red-orange, or yellow for decorative purposes; amber is reserved for functional warning states only.
6. **SweetAlert2 (#7066e0 purple) is a vendor UI layer** — if you need a dialog/confirmation pattern, use the blue primary (#3D96FF) for confirm buttons, not the purple from the SweetAlert CSS.
7. **Form labels are 18px (1.125em) weight 500** — matching the input font-size; if you reduce label size to 14px, pair it with a matching input reduction to maintain optical alignment.
8. **No italic variants exist** — for editorial emphasis within body copy, use weight 500 or color `#3D96FF`; do not apply `font-style: italic` as it will fall back to browser-synthesized italic on Inter, producing suboptimal results.
