# Public API Review

This review records the current public surface of `@schedulespark/calendar` before npm publishing.

## Package Entrypoints

- `@schedulespark/calendar`
  - React component exports.
  - Public types used by React consumers.
  - Core helpers re-exported for convenience where already part of the package API.
- `@schedulespark/calendar/core`
  - Framework-agnostic date range, layout, recurrence, interaction, and event color helpers.
- `@schedulespark/calendar/styles.css`
  - Required stylesheet for React calendar rendering.
- `@schedulespark/calendar/playground`
  - Demo playground exports for local validation.
- `@schedulespark/calendar/playground.css`
  - Playground-only stylesheet.

## Stability Notes

- The package is beta. APIs may change before `1.0.0`.
- Event data remains caller-owned. Interaction callbacks emit drafts and never persist data internally.
- Date calculations are UTC-based unless a helper explicitly documents different behavior.
- Recurrence expansion is bounded by caller-provided visible ranges.
- React and React DOM remain peer dependencies.

## Reviewed Export Areas

- Calendar views: `day`, `week`, `workweek`, `month`.
- Event model: timed events, all-day events, recurrence fields, resource ids, explicit colors.
- Layout helpers: visible ranges, time-grid layout, resource layout, month helpers, recurrence expansion.
- Interaction model: move, resize-start, resize-end drafts, collision policy, snap and minimum duration settings.
- Accessibility model: labels and keyboard behavior are part of the React component behavior, not a separate API contract.

## Before Removing Beta Status

- Audit all exported types for naming consistency and unnecessary fields.
- Confirm timezone behavior and recurrence behavior are final.
- Confirm resource-lane and interaction callback semantics are stable.
- Confirm package bundle contents and exports match the documented entrypoints.
