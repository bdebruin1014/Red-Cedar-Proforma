# Red Cedar Platform Color Scheme

## Overview

The Red Cedar Platform uses a sophisticated dark theme with warm cedar brown accents. The color scheme creates a professional, elegant interface optimized for financial data visualization and analysis.

## Primary Color Palette

### Cedar (Primary Brand Color)
A warm, earthy brown palette inspired by red cedar wood, used for primary actions, highlights, and branding.

| Shade | Hex Code | RGB | Usage |
|-------|----------|-----|-------|
| `cedar-50` | `#f6f3f0` | rgb(246, 243, 240) | Very light backgrounds, subtle highlights |
| `cedar-100` | `#e8e0d8` | rgb(232, 224, 216) | Light backgrounds |
| `cedar-200` | `#d4c4b4` | rgb(212, 196, 180) | Borders, dividers |
| `cedar-300` | `#b9a08a` | rgb(185, 160, 138) | Active tabs, selected states |
| `cedar-400` | `#a07e66` | rgb(160, 126, 102) | Hover states |
| `cedar-500` | `#8b6a4f` | rgb(139, 106, 79) | Primary brand color, focus rings |
| `cedar-600` | `#745541` | rgb(116, 85, 65) | Primary buttons, logo background |
| `cedar-700` | `#5e4436` | rgb(94, 68, 54) | Pressed states |
| `cedar-800` | `#4d382e` | rgb(77, 56, 46) | Dark accents |
| `cedar-900` | `#3d2d25` | rgb(61, 45, 37) | Very dark backgrounds |
| `cedar-950` | `#221914` | rgb(34, 25, 20) | Deepest shade |

### Slate (Background & Text)
A cool, blue-tinted gray palette used for backgrounds, text, and structural elements.

| Shade | Hex Code | Usage |
|-------|----------|-------|
| `slate-950` | Default Tailwind | Main background (`bg-slate-950`) |
| `slate-900` | Default Tailwind | Card backgrounds (`bg-slate-900/60`) |
| `slate-850` | `#172033` | Custom dark shade |
| `slate-800` | Default Tailwind | Input backgrounds, borders |
| `slate-700` | Default Tailwind | Input borders |
| `slate-500` | Default Tailwind | Placeholder text, stat labels |
| `slate-400` | Default Tailwind | Labels, secondary text |
| `slate-200` | Default Tailwind | Hover text |
| `slate-100` | Default Tailwind | Primary text color |

## CSS Custom Properties

```css
:root {
  --cedar-500: #8b6a4f;
  --cedar-600: #745541;
}
```

## Typography

### Font Families

```javascript
{
  display: ["DM Serif Display", "Georgia", "serif"],
  body: ["DM Sans", "system-ui", "sans-serif"],
  mono: ["JetBrains Mono", "monospace"]
}
```

- **Display Font**: DM Serif Display - Used for headings, logo, and brand elements
- **Body Font**: DM Sans - Used for all body text and UI elements
- **Mono Font**: JetBrains Mono - Used for numbers, data, and financial figures

## Component Patterns

### Buttons

#### Primary Button
```css
bg-cedar-600 hover:bg-cedar-500 text-white
focus:ring-2 focus:ring-cedar-500/40
```
- Background: `cedar-600` (#745541)
- Hover: `cedar-500` (#8b6a4f)
- Text: White
- Focus ring: `cedar-500` at 40% opacity

#### Ghost Button
```css
text-slate-400 hover:text-slate-200 hover:bg-slate-800/50
```
- Text: `slate-400` → `slate-200` on hover
- Hover background: `slate-800` at 50% opacity

### Inputs

```css
bg-slate-800/50 border border-slate-700/50
text-slate-100 placeholder-slate-500
focus:ring-2 focus:ring-cedar-500/40 focus:border-cedar-500/60
```

- Background: `slate-800` at 50% opacity
- Border: `slate-700` at 50% opacity
- Text: `slate-100`
- Placeholder: `slate-500`
- Focus ring: `cedar-500` at 40% opacity
- Focus border: `cedar-500` at 60% opacity

### Cards

```css
bg-slate-900/60 border border-slate-800/60
```

- Background: `slate-900` at 60% opacity
- Border: `slate-800` at 60% opacity
- Creates a subtle glass-morphism effect

### Navigation

#### Header
```css
bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60
```

- Background: `slate-950` at 80% opacity with blur
- Border: `slate-800` at 60% opacity

#### Active Tab
```css
bg-cedar-600/20 text-cedar-300 border border-cedar-600/30
```

- Background: `cedar-600` at 20% opacity
- Text: `cedar-300`
- Border: `cedar-600` at 30% opacity

#### Inactive Tab
```css
text-slate-400 hover:text-slate-200 hover:bg-slate-800/50
```

### Selection

Text selection uses cedar with opacity:
```css
::selection {
  background-color: rgba(139, 106, 79, 0.3); /* cedar-500 at 30% */
}
```

## Visual Effects

### Backdrop Blur
Many components use `backdrop-blur-md` or `backdrop-blur-sm` for a modern glass-morphism effect.

### Noise Texture
A subtle noise texture overlay is applied with 1.5% opacity for added visual depth:

```css
.noise-bg::before {
  opacity: 0.015;
  background-image: url("data:image/svg+xml,..."); /* SVG noise pattern */
}
```

### Opacity Patterns
The design heavily uses opacity for layering:
- Backgrounds: 50-80% opacity
- Borders: 50-60% opacity
- Focus states: 30-40% opacity

## Accessibility

- **Contrast Ratios**: Text colors maintain WCAG AA compliance
- **Focus Indicators**: All interactive elements have visible focus rings using `cedar-500` at 40% opacity
- **Color Independence**: Information is not conveyed by color alone

## Usage Guidelines

### When to Use Cedar
- Primary actions (Save, Submit, Create)
- Brand elements (logo, wordmark)
- Active/selected states
- Focus indicators
- Important highlights

### When to Use Slate
- Text content
- Backgrounds and surfaces
- Borders and dividers
- Secondary actions
- Disabled states

## Color Philosophy

The Red Cedar Platform color scheme balances professionalism with warmth:

1. **Dark Theme**: Reduces eye strain for data-intensive work
2. **Cedar Accents**: Provides warmth and brand identity without overwhelming
3. **Slate Foundation**: Creates a neutral, professional backdrop
4. **Opacity Layers**: Adds depth and hierarchy through translucent overlays
5. **Glass-morphism**: Modern aesthetic with backdrop blur effects

## Implementation

Colors are defined in `tailwind.config.js` and extended utilities in `app/globals.css`. The theme uses:

- **Tailwind CSS**: For responsive design and utility classes
- **Custom Color Extensions**: Cedar palette and slate-850
- **CSS Custom Properties**: For dynamic theming support
- **Component Classes**: Reusable patterns in @layer components

## Example Color Combinations

### High Contrast (Readability)
- Text: `text-slate-100` on Background: `bg-slate-950`
- Text: `text-white` on Background: `bg-cedar-600`

### Medium Contrast (Secondary Elements)
- Text: `text-slate-400` on Background: `bg-slate-900`
- Text: `text-cedar-300` on Background: `bg-cedar-600/20`

### Low Contrast (Subtle Elements)
- Border: `border-slate-800/60` on Background: `bg-slate-950`
- Background: `bg-slate-800/50` on Background: `bg-slate-900`
