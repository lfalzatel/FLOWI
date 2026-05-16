---
name: Luminous Flow
colors:
  surface: '#131318'
  surface-dim: '#131318'
  surface-bright: '#39383e'
  surface-container-lowest: '#0e0e13'
  surface-container-low: '#1b1b20'
  surface-container: '#1f1f25'
  surface-container-high: '#2a292f'
  surface-container-highest: '#35343a'
  on-surface: '#e4e1e9'
  on-surface-variant: '#bacbbf'
  inverse-surface: '#e4e1e9'
  inverse-on-surface: '#303036'
  outline: '#84958a'
  outline-variant: '#3b4a41'
  surface-tint: '#00e29e'
  primary: '#6effc0'
  on-primary: '#003824'
  primary-container: '#00e5a0'
  on-primary-container: '#006141'
  inverse-primary: '#006c49'
  secondary: '#c6c4df'
  on-secondary: '#2f2e43'
  secondary-container: '#47475d'
  on-secondary-container: '#b8b6d0'
  tertiary: '#74fec3'
  on-tertiary: '#003825'
  tertiary-container: '#54e1a8'
  on-tertiary-container: '#006142'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#47ffb8'
  primary-fixed-dim: '#00e29e'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#e2e0fc'
  secondary-fixed-dim: '#c6c4df'
  on-secondary-fixed: '#1a1a2e'
  on-secondary-fixed-variant: '#45455b'
  tertiary-fixed: '#71fbc0'
  tertiary-fixed-dim: '#50dea5'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#131318'
  on-background: '#e4e1e9'
  surface-variant: '#35343a'
  off-white: '#F0F4F8'
  glass-surface: rgba(255, 255, 255, 0.06)
  glass-border: rgba(255, 255, 255, 0.10)
  error-red: '#EF4444'
  text-high: rgba(255, 255, 255, 0.90)
  text-med: rgba(255, 255, 255, 0.50)
  text-low: rgba(255, 255, 255, 0.20)
typography:
  display-lg:
    fontFamily: Syne
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Syne
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Syne
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  title-md:
    fontFamily: Syne
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.4'
  body-lg:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-lg:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
  label-sm:
    fontFamily: DM Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.02em
  caption:
    fontFamily: DM Sans
    fontSize: 10px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  container-padding-mobile: 16px
  container-padding-desktop: 24px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system embodies the "Tu dinero, en flujo" philosophy by creating an interface that feels liquid, continuous, and alive. The brand personality is **modern, sleek, and energetic**, targeting a tech-savvy audience that views personal finance as a dynamic journey rather than a static ledger.

The visual style is **Dark Glassmorphism**. It utilizes semi-transparent surfaces and deep background blurs to create a sense of physical layering. High-contrast neon accents provide a "digital pulse" to the UI, ensuring that the most critical financial data and actions are immediately visible. This aesthetic moves away from traditional, "heavy" banking apps toward a lightweight, atmospheric experience that feels like a native PWA.

## Colors
The palette is rooted in a "Deep Sea" dark mode, using `#0A0A0F` as the foundation to make neon elements pop. 

- **Primary (Mint Green):** Used for brand identity, active states, and high-priority call-to-actions. It should carry a subtle outer glow (bloom) when used on dark backgrounds.
- **Secondary (Charcoal):** Used for elevated surfaces that require more definition than the base background.
- **Glass System:** The core of the interface. Use `glass-surface` combined with a `20px` backdrop blur. 
- **Typography Colors:** `off-white` is the standard for readability, while varying opacities (`90%`, `50%`, `20%`) define information hierarchy.
- **Atmospheric Accents:** A large, soft radial gradient of `#00E5A0` at `10%` opacity should be fixed in the background to prevent the dark mode from feeling "flat."

## Typography
The typography strategy contrasts the experimental, artistic nature of **Syne** with the utilitarian precision of **DM Sans**.

- **Branding & Headlines:** Use Syne. It should be set with tight tracking to emphasize its bold, geometric character.
- **Data & Interface:** Use DM Sans for all functional text, numbers, and labels. DM Sans provides the necessary clarity for financial figures.
- **Scale:** On mobile devices, ensure headlines do not exceed `24px` to maintain optimal line lengths within glass containers. 
- **Hierarchy:** Use font weight and color opacity rather than just size to distinguish between primary and secondary information.

## Layout & Spacing
The system uses a **Fluid Grid** model with a soft 4px baseline rhythm.

- **Mobile (PWA):** Focus on a single-column layout with a floating "pill" navigation bar at the bottom. The navigation should be offset from the screen edges by `24px`.
- **Desktop:** Transition to a 12-column grid. A fixed left sidebar (`280px`) houses the primary navigation, while the main content area utilizes fluid containers with a `max-width` of `1200px`.
- **Spacing Logic:** Use "Stack" spacing (vertical) to group related financial items. Cards and containers should use `16px` internal padding to ensure the glass effect has enough "breathable" surface area.

## Elevation & Depth
Depth is created through transparency and blur rather than shadows. 

1. **Base Layer:** The Deep Black `#0A0A0F` background.
2. **Mid Layer (Cards/Panels):** `glass-surface` with `backdrop-blur-xl`. Borders are `1px` solid `glass-border` to define edges against the background.
3. **Top Layer (Modals/Navigation):** `glass-surface` with `backdrop-blur-2xl`. These receive a soft, diffused shadow (`rgba(0,0,0,0.5)`) to suggest they are floating highest in the Z-space.
4. **Active Glow:** Interactive elements like the "Add" button use a Mint Green glow (`shadow-[#00E5A0]/30`) to simulate an emitted light source from behind the glass.

## Shapes
The shape language is organic and highly rounded, mirroring the "flow" concept.

- **Standard Containers:** Use `16px` (`rounded-2xl`) for cards and menu surfaces.
- **Pill Elements:** Navigation bars and profile capsules use a `rounded-full` or `rounded-[28px]` approach to feel soft and ergonomic for thumb interactions on mobile.
- **Interactive Triggers:** Buttons and input fields should utilize `12px` (`rounded-xl`) to maintain a distinct but related look to the parent cards.

## Components

- **Buttons:** 
  - *Primary:* Mint Green background, black text, no border. Heavy glow on hover.
  - *Secondary:* Glass background, off-white text, `1px` white/10 border.
- **Action Button (FAB):** Specifically for "Add Expense," this should be a large circular button with a `stroke-[2.5]` Lucide icon and a persistent neon pulse or glow.
- **Glass Cards:** The primary container for financial data. Must have `backdrop-filter: blur(20px)` and a subtle gradient stroke (top-left to bottom-right) to simulate light hitting the edge of a glass pane.
- **Inputs:** Darker than the card background (`#0D0D1A`), with a Mint Green bottom border that activates/glows on focus.
- **Chips/Capsules:** Used for categories (e.g., "Food," "Rent"). These should be semi-transparent with `label-sm` typography.
- **Lists:** Items should be separated by `1px` white/5 lines, with interactive states that slightly increase the opacity of the glass background.
- **Progress Bars:** Backgrounds are white/10; the "fill" is a linear gradient from `#00B37E` to `#00E5A0`.