# Calendar performance

This document describes how `@schedulespark/calendar` stays responsive as schedules grow, and where future work is planned.

## Current optimizations

### Layout core

- **Resource day view:** `layoutResourceEvents` resolves each resource lane with a `Map` lookup instead of `findIndex` per event.
- **Week/work-week view:** `layoutEvents` precomputes day bounds once per visible range.
- **Month view:** `indexEventsByUtcDay` builds reusable per-day buckets once per render instead of scanning the full event list inside every day cell.
- **Recurrence:** parsed RRULE objects are cached per master event during expansion.
- **Drag collisions:** `hasCollision` skips events outside the active lane before interval checks.

### React rendering

- **Time grid columns:** slot rows are drawn with CSS repeating gradients instead of one DOM node per slot per column.
- **Memoization:** `TimeGridCalendar` memoizes slots, layouts, and columns; `AllDayRow` and `MonthView` memoize per-column/per-day event buckets.

## Practical limits

| View | Comfortable scale | Notes |
|------|-------------------|-------|
| Week / work-week | 500+ timed events | Layout is O(events × days) with a small day count |
| Month | 1,000+ events | Indexing is O(events × days in grid) |
| Resource day view | ~50 resources without windowing | All columns render in the DOM; horizontal scroll only |

## Virtualization strategy (planned)

Resource-heavy day views are the main candidate for column windowing:

1. Measure the scroll container width.
2. Render only visible resource columns plus a small buffer.
3. Keep header, all-day row, and body scroll positions synchronized via `useHorizontalScrollSync`.

Vertical time windowing is lower priority because CSS-based slot backgrounds already removed the largest DOM cost.

## Bundle hygiene

Runtime dependencies are intentionally minimal:

- `@schedulespark/rrule` (workspace package, no third-party runtime deps)
- `react` / `react-dom` (peer dependencies)

Use `@schedulespark/calendar/core` when you only need headless layout utilities.

Run `pnpm --filter @schedulespark/calendar check:bundle` after building to inspect output sizes.

## Regression tests

`test/layout-performance.test.ts` exercises realistic worker schedules and asserts layout, indexing, and recurrence expansion complete within a 100ms budget in CI.
