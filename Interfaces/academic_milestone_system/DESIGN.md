---
name: Academic Milestone System
colors:
  surface: '#f9f9fb'
  surface-dim: '#d9dadc'
  surface-bright: '#f9f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f5'
  surface-container: '#eeeef0'
  surface-container-high: '#e8e8ea'
  surface-container-highest: '#e2e2e4'
  on-surface: '#1a1c1d'
  on-surface-variant: '#494453'
  inverse-surface: '#2f3132'
  inverse-on-surface: '#f0f0f2'
  outline: '#7b7484'
  outline-variant: '#cbc3d5'
  surface-tint: '#6c45c0'
  primary: '#461599'
  on-primary: '#ffffff'
  primary-container: '#5e35b1'
  on-primary-container: '#ceb8ff'
  inverse-primary: '#d1bcff'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfde'
  on-secondary-container: '#636262'
  tertiary: '#5a2f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#7b4200'
  on-tertiary-container: '#ffb371'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d1bcff'
  on-primary-fixed: '#24005b'
  on-primary-fixed-variant: '#5429a7'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#ffdcc2'
  tertiary-fixed-dim: '#ffb77a'
  on-tertiary-fixed: '#2e1500'
  on-tertiary-fixed-variant: '#6d3a00'
  background: '#f9f9fb'
  on-background: '#1a1c1d'
  surface-variant: '#e2e2e4'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style

The design system is anchored in **Minimalism** with a **Corporate/Modern** backbone, specifically tailored for the gravity of academic achievement. The personality is "Quietly Authoritative"—it prioritizes clarity and efficiency over decorative flourishes, ensuring that students, faculty, and administrators can navigate complex graduation workflows without cognitive friction.

The visual language uses high-contrast ratios and an "Information First" hierarchy. By stripping away non-essential styling, the system elevates the content—student data, ceremony details, and degree statuses—to the primary visual layer. The result is a digital environment that feels stable, institutional, and premium.

## Colors

The palette is restricted to maintain an institutional aesthetic. **Pure White (#FFFFFF)** serves as the primary canvas to maximize whitespace and light. 

- **Primary (#5E35B1):** A deep, scholarly purple used sparingly for primary actions, progress indicators, and active states. It provides a dignified accent that signifies importance.
- **Grayscale:** We use a high-contrast scale. **Deep Black (#1A1A1A)** is reserved for headings and primary labels to ensure maximum legibility. **Dark Grey (#4A4A4A)** is used for body copy and supporting metadata.
- **Functional Colors:** Error, success, and warning states should utilize desaturated versions of red, green, and amber to remain consistent with the professional tone.

## Typography

This design system utilizes **Inter** for its exceptional legibility and systematic feel. The type scale is built on a tight ratio to prevent excessive variation, maintaining a "grid-like" feel even in text-heavy views.

- **Headlines:** Use tighter letter spacing and heavier weights to anchor sections.
- **Body:** Generous line heights (1.5x) are mandatory to facilitate the reading of long academic policies or graduation requirements.
- **Labels:** Small labels use a slightly increased letter spacing and medium weight to remain legible even at 12px.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy on desktop to ensure administrative dashboards remain scannable and organized. 

- **Desktop (1280px+):** 12-column grid, 24px gutters, 64px side margins.
- **Tablet (768px - 1279px):** 8-column grid, 24px gutters, 32px side margins.
- **Mobile (<767px):** 4-column grid, 16px gutters, 16px side margins.

We employ "Generous Negative Space." Elements are grouped logically with `24px` (md) gaps, while major sections are separated by `64px` (xl) to create a clear visual break between disparate data sets.

## Elevation & Depth

To maintain the minimalist aesthetic, this design system avoids heavy drop shadows. Depth is communicated through **Low-Contrast Outlines** and **Tonal Layers**.

1. **Surface Level 0 (Base):** Pure #FFFFFF.
2. **Surface Level 1 (Cards/Containers):** Pure #FFFFFF with a 1px solid border (#E0E0E0).
3. **Surface Level 2 (Modals/Popovers):** Pure #FFFFFF with a very soft, high-diffusion shadow (0px 8px 24px rgba(0,0,0,0.04)) to indicate focus without breaking the flat aesthetic.

Interactive states (hover/active) should rely on subtle background color shifts (e.g., White to #F5F5F7) rather than increasing shadow depth.

## Shapes

The shape language is **Soft** but disciplined. 

- **Standard Elements:** 4px (`0.25rem`) corner radius for buttons, input fields, and checkboxes. This creates a professional look that is approachable but remains structural and "institutional."
- **Large Containers:** 8px (`0.5rem`) for cards and modals.
- **Status Pills:** Fully rounded (pill-shaped) to distinguish them from interactive buttons.

## Components

### Buttons
- **Primary:** Solid Purple (#5E35B1) with white text. 48px minimum height for touch accessibility.
- **Secondary:** Transparent background with 1px border (#1A1A1A) and black text.
- **Tertiary:** Text-only with 600 weight, used for "Cancel" or "Back" actions.

### Input Fields
- **Default:** White background, 1px border (#E0E0E0), 48px height.
- **Focus State:** 2px border (#5E35B1) with no outer glow. Labels must be persistent (not floating) for maximum accessibility.

### Cards
- Used for student profiles or ceremony details. White background, 1px border, 24px internal padding. 

### Status Chips
- Used for "Approved," "Pending," or "Action Required." Use desaturated background tints with high-contrast text (e.g., light green background with dark green text) to ensure readability for users with visual impairments.

### Lists
- For student rosters, use high-density rows with 1px bottom dividers. Ensure a 44px minimum vertical hit area for every row item.