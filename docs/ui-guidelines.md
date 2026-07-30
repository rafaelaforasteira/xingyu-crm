# UI guidelines

## Tokens

All colors via CSS variables (`--color-primary`, `--color-surface`, etc.). Do not hardcode brand purples in components.

Provisional palette: light lilac-gray background, white surfaces, purple primary, navy text, status greens/ambers/reds/blues.

## Typography

Prefer Plus Jakarta Sans / Manrope via `next/font`. Avoid Inter/Roboto/Arial as primary UI fonts.

## Layout

- Compact collapsible sidebar (preference persisted)
- Soft shadows, rounded-2xl surfaces, generous whitespace
- Premium SaaS density — clear hierarchy, few competing accents

## CRM patterns

- Metric cards are clickable and apply filters on destination routes
- Deal card click opens DealWorkspace; drag moves stage
- Conversation is the default deal tab
- Every list supports loading skeleton + empty + error states
