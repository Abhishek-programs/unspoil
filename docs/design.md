---
name: The Vault
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#3f493f'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#6f7a6e'
  outline-variant: '#bdcaba'
  surface-tint: '#056d2e'
  primary: '#00501f'
  on-primary: '#ffffff'
  primary-container: '#006b2c'
  on-primary-container: '#8ee99b'
  inverse-primary: '#80da8d'
  secondary: '#5c5f61'
  on-secondary: '#ffffff'
  secondary-container: '#dee0e2'
  on-secondary-container: '#606365'
  tertiary: '#424546'
  on-tertiary: '#ffffff'
  tertiary-container: '#5a5c5e'
  on-tertiary-container: '#d4d4d7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9cf7a7'
  primary-fixed-dim: '#80da8d'
  on-primary-fixed: '#002109'
  on-primary-fixed-variant: '#005320'
  secondary-fixed: '#e1e3e5'
  secondary-fixed-dim: '#c4c7c9'
  on-secondary-fixed: '#191c1e'
  on-secondary-fixed-variant: '#444749'
  tertiary-fixed: '#e2e2e4'
  tertiary-fixed-dim: '#c5c6c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#454749'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Geist Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  data-display:
    fontFamily: Geist Mono
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  data-metric:
    fontFamily: Geist Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.0'
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  container-max: 1440px
  margin-mobile: 16px
  margin-desktop: 48px
  gutter: 24px
  unit: 4px
  section-gap: 48px
  card-gap: 24px
---

## Brand & Style

The brand identity for "The Vault" is centered on **Strategic Sophistication**. It targets individuals managing high-stakes financial goals who value precision, security, and long-term planning. The aesthetic is a blend of **Corporate Modern** and **Technical Minimalist**, utilizing a restrained palette with punchy accents to signify progress and optimization.

The emotional response should be one of "calm control." The UI achieves this through high-quality typography, generous white space, and subtle organic backgrounds that soften the clinical nature of financial data. The design language emphasizes high-fidelity data visualization and clear hierarchy to reduce cognitive load in complex decision-making.

## Colors

The color palette is rooted in a deep, institutional "Finance Green" (#006b2c) that signifies growth and stability. This is balanced against a sophisticated neutral scale that prioritizes readability and depth.

- **Primary:** Used for progress indicators, active navigation states, and primary CTAs. It represents "On Track" status and financial health.
- **Secondary/Tertiary:** Cool-toned grays used for auxiliary text and inactive icons, ensuring the primary green remains the focus.
- **Surface Scale:** A multi-layered approach to light mode, using `#ffffff` for the primary card surfaces to pop against a slightly dimmed `#f9f9f9` background.
- **Functional Accents:** A sharp `#ba1a1a` red is reserved exclusively for high-priority alerts or debt-related metrics, creating an immediate visual "nudge."

## Typography

The system employs a dual-font strategy. **Inter** handles all narrative and structural content, providing a clean, Swiss-inspired foundation that feels authoritative. **Geist Mono** is used as a functional secondary typeface for labels and financial data points, invoking a sense of technical precision and "ledger-like" accuracy.

Hierarchy is strictly enforced through the use of uppercase tracking on labels and variable weights in headlines to differentiate between category headers and card titles. Data metrics use the monospaced Geist font to ensure tabular alignment and numerical clarity.

## Layout & Spacing

The system uses a **Fixed Grid** approach for desktop and a fluid single-column layout for mobile. 

- **Desktop:** A 12-column structure where the main content occupies 8 columns and a sticky sidebar occupies 4 columns. 
- **Rhythm:** A 4px baseline grid governs all internal component spacing (padding/margins).
- **Page Layout:** Generous top padding (80px on desktop) establishes a premium feel. Content is grouped into logical sections separated by 48px, while individual cards within sections are separated by 24px.
- **Safe Areas:** Mobile margins are set to 16px to maximize screen real estate for data tables, while desktop margins expand to 48px for a more "breathable" dashboard experience.

## Elevation & Depth

Visual hierarchy is established through a mix of **Tonal Layers** and **Ambient Shadows**:

- **Surfaces:** The primary background uses `surface-dim`. Active content sits on `surface-container-lowest` (pure white) to create a clear "raised" effect.
- **Shadows:** Cards utilize a very soft, highly diffused shadow (`0 4px 24px rgba(0,0,0,0.04)`) to suggest elevation without looking heavy or dated.
- **Depth Effects:** High-importance cards include a "Tonal Background Graphic"—a subtle, primary-tinted radial blur (5% opacity) in the corner—to draw the eye toward progress indicators.
- **Glassmorphism:** The bottom navigation bar uses a high-density backdrop blur (20px) with 70% opacity white, creating a sense of persistent accessibility over the scrolling content.

## Shapes

The shape language is **exaggeratedly rounded** for containers, contrasting with sharper internal data elements. 

- **Primary Cards:** Use a 32px (`rounded-[32px]`) corner radius, creating a friendly, modern "pill-box" aesthetic.
- **Utility Elements:** Buttons, chips, and small alerts use a full pill shape (`rounded-full`) to maintain a soft, approachable feel for interactive elements.
- **Structural Dividers:** Progress bars and horizontal rules use rounded caps to match the global radius strategy.

## Components

### Buttons & Chips
- **Primary Buttons:** Text-only in `label-caps` style, using the primary green and uppercase tracking.
- **Status Chips:** Small, pill-shaped containers with 10% opacity backgrounds matching the status color (Green for "On Track", Gray for "Target"). They must include a 14px Material Symbol icon.

### Cards
- **Goal Cards:** Must contain a header (title + subtitle), a secondary status chip, and a bottom-aligned progress section.
- **Nudge Cards:** Use a flat border (`outline-variant`) instead of a shadow, and feature a solid primary-colored accent bar on the left edge to denote "active intelligence."

### Progress Indicators
- Linear bars with a 8px height. The background track should be `surface-container-high`, while the indicator is the solid `primary` green.

### Navigation
- **Bottom Bar:** Fixed position with a 80px height. Active states are indicated by the primary color and a solid icon fill, while inactive states use secondary gray and outlined icon variants.