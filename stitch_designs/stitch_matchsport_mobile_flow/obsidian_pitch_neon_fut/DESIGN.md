---
name: Obsidian Pitch & Neon FUT
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363940'
  surface-container-lowest: '#0b0e14'
  surface-container-low: '#191c22'
  surface-container: '#1d2026'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e1e2eb'
  on-surface-variant: '#bacbb9'
  inverse-surface: '#e1e2eb'
  inverse-on-surface: '#2e3037'
  outline: '#859585'
  outline-variant: '#3b4a3d'
  surface-tint: '#00e475'
  primary: '#75ff9e'
  on-primary: '#003918'
  primary-container: '#00e676'
  on-primary-container: '#00612e'
  inverse-primary: '#006d35'
  secondary: '#ffb95f'
  on-secondary: '#472a00'
  secondary-container: '#ee9800'
  on-secondary-container: '#5b3800'
  tertiary: '#ffdcd9'
  on-tertiary: '#68000a'
  tertiary-container: '#ffb6b0'
  on-tertiary-container: '#aa091b'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#62ff96'
  primary-fixed-dim: '#00e475'
  on-primary-fixed: '#00210b'
  on-primary-fixed-variant: '#005226'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930013'
  background: '#10131a'
  on-background: '#e1e2eb'
  surface-variant: '#32353c'
typography:
  display-ovr:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 52px
  display-ovr-mobile:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 40px
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
  headline-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-tactical:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
  label-stat:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system drives a competitive amateur sports mobile experience tailored for players who treat local turf matches with the gravity and excitement of professional esports leagues. The design fuses the high-intensity atmosphere of EA Sports FC Ultimate Team (FUT) interfaces with tactical, data-rich sports tracking.

### Aesthetics & Tone
- **Electric Esports Meets Turf Realism:** Deep pitch-dark backgrounds mimic night stadium spotlights, allowing neon green status cues and metallic gold accolades to pierce the interface with precision.
- **Aggressive, Polished, and Tactical:** Interfaces convey competitive weight. Every visual element—from matchmaking radar rings to player OVR badges—feels engineered, calibrated, and premium.
- **Tactile Feedback & Immediacy:** Designed for touch screens with rapid, high-confidence interactions: quick post-match scoring, swift player rating taps, and real-time lobby state changes.

## Colors

The color palette establishes an electric stadium night atmosphere. Contrast is calibrated to keep critical actions prominent and reduce eye strain in low-light environments.

- **Obsidian Dark Surface (`#0B0E14`):** Base canvas layer; pure night-game backdrop.
- **Tactical Slate (`#161B22`):** Primary card, sheet, and list-surface token, providing crisp separation without harshness.
- **Elevated Slate (`#1F2937`):** Tonal surface for nested interactive components, chip backgrounds, and input fields.
- **Electric Emerald (`#00E676`):** Primary action token. Guides user flow across match confirmations, matchmaking pulses, ready statuses, and active pitch coordinates.
- **Championship Gold (`#F59E0B`):** Prestige token. Reserved for FUT-inspired overall ratings (OVR), tournament tiers, MVP honors, and match milestones.
- **Dispute Crimson (`#EF4444`):** Destructive token. Communicates declined invites, disciplinary fouls, cancelations, and active disputes.
- **White & Silver Typography (`#F9FAFB` / `#9CA3AF`):** Maximum typographic legibility against deep dark surfaces without blinding glare.

## Typography

The typographic hierarchy pairs the utilitarian legibility of `Inter` for real-time match events, chat, and system feeds with the technical, angular impact of `Space Grotesk` for scores, badges, player ratings, and section headers.

- **Tactical Display & OVR (`display-ovr`):** High-density geometric weight meant to mimic console esports HUDs. Used for FUT rating cards, goal counters, and countdown clocks.
- **Labels & Micro-Badges (`label-tactical`):** Always displayed in uppercase with `+0.05em` letter tracking to emulate sports jersey printing and stadium broadcast scorebugs.
- **Body (`body-md` / `body-sm`):** Set with `Inter` to maintain high readability across rapid scrolling, live activity streams, and compact match rosters.

## Layout & Spacing

The layout is built for native mobile operating contexts (iOS and Android via React Native) using a 4px base rhythm and an adaptive single-column container structure with dynamic horizontal gutters.

- **Mobile First Canvas:** 16px (`margin`) outer horizontal margins on standard phones, extending safe areas around screen notches and system gesture indicators.
- **Roster & Stat Grids:** 2-column and 4-column compact layouts for player stats, lineup visualizers, and card grids separated by 8px or 16px (`gutter`).
- **Touch Targets:** Interactive elements conform to a strict 48x48pt minimum interactive bounding box, even when visual badges appear smaller.

## Elevation & Depth

Visual hierarchy uses physical stacking, translucent surfaces, and targeted neon luminescence instead of standard diffuse drop shadows.

- **Level 0 (Pitch Base):** Pure `#0B0E14` void with optional subtle radial gradient accents representing stadium lighting.
- **Level 1 (Card Deck):** `#161B22` with a `1px` crisp border of `rgba(255, 255, 255, 0.08)`. Forms the main container for match summaries and player rosters.
- **Level 2 (Active Focus & FUT Shield):** `#1F2937` with `rgba(0, 230, 118, 0.15)` internal illumination or `rgba(245, 158, 11, 0.15)` for gold card tiers.
- **Level 3 (Modals & Match Lobbies):** Floating sheets utilizing frosted glass `backdrop-filter: blur(20px)` over `rgba(22, 27, 34, 0.85)` with ambient neon rim lighting.
- **Neon Glow Bleed:** Key interactive elements (e.g., "Find Match" floating action button) cast an electric emerald aura: `box-shadow: 0px 4px 24px rgba(0, 230, 118, 0.35)`.

## Shapes

The design system maintains a modern athletic curvature balanced between clean ergonomics and tactical shield geometry.

- **Standard Elements (Corners `1rem` / 16px):** Action cards, sheet panels, match summary tiles, and bottom-sheet containers.
- **Hero & Shield Elements (Corners `1.5rem` / 24px):** FUT player cards, modal viewports, and primary onboarding modules.
- **Capsule Elements (Pill-shaped):** Status pills, live minute tags, tactical position badges (e.g., `CAM`, `CB`, `ST`), and quick-tap incremental score buttons.

## Components

### Buttons
- **Primary CTA ("Find Match", "Confirm Result"):** Vibrant Electric Emerald (`#00E676`) solid fill, `#0B0E14` high-contrast bold typography (`Space Grotesk`), pill or `1rem` radius. Emits an ambient emerald aura on active state.
- **Secondary Action ("Tactics", "View Profile"):** Elevated slate surface (`#1F2937`), `1px` subtle glass rim (`rgba(255, 255, 255, 0.12)`), text color `#F9FAFB`.
- **Destructive Action ("Dispute Score", "Forfeit"):** Deep crimson outline with subtle red glass tint (`rgba(239, 68, 68, 0.15)`), border `1px solid #EF4444`.

### FUT-Inspired Player Cards
- **Shield Silhouette:** Card ratio approximating 5:7, bordered with a dual hairline gold or silver gradient stroke.
- **Badge Anatomy:** Top-left stacked cluster displaying overall score (`display-ovr`) above the primary player position code (`label-tactical`). Central player portrait clipped within transparent polygon boundaries.
- **Stat Matrix:** Bottom section displaying the 6 core metrics (PAC, SHO, PAS, DRI, DEF, PHY) using two rows of three compact columns with label-value pairs.

### Matchmaking Radar
- Concentric circular rings rendered in `rgba(0, 230, 118, 0.2)` pulsing outward from center.
- Rotating sweep line with emerald gradient trail locating nearby available squads and players.

### Tactile 1-Tap Rating Controls
- Horizontal thumb-strip segmented buttons. Tapping yields immediate micro-haptic feedback.
- Selected number illuminates in Gold (`#F59E0B`) with an extruded top-border highlight to signify locked confirmation.

### Status Chips & Badges
- Live Match Badge: Electric Emerald capsule containing a pulsating 6px white dot accompanied by uppercase game minute (`84' LIVE`).
- Position Indicator: High-contrast micro-pill with a dark slate background and emerald border denoting tactical pitch assignment.