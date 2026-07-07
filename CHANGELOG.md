# Changelog

All notable changes to `@schedulespark/calendar` are documented here.

This project follows a pre-1.0 beta release model. Until `1.0.0`, minor and patch beta releases may include API adjustments. Version changes must be approved as explicit release decisions before publishing.

## 0.0.1-beta-3-0-0

- **Breaking: rewrote the package as framework-free vanilla TypeScript.** `ScheduleCalendar` (React) and the `react`/`react-dom` peer dependencies are removed. The new `createCalendar(options)` factory returns a `mount(host)` / `setDate()` / `setEvents()` / `setOptions()` / `setView()` / `destroy()` instance, mirroring `@schedulespark/date-picker` and `@schedulespark/time-picker`'s API conventions. Day/week/work-week/month rendering, resource lanes, recurrence, pointer drag/resize, keyboard move/resize, event selection, and horizontal scroll-sync between the header/all-day-row/body are all supported — full parity with the previous React component's interaction model. The scroll-sync rewrite also simplifies the architecture: the vanilla renderer owns all three scroll regions as plain DOM elements in one closure, instead of forwarding refs across component boundaries as the React version did. The headless `@schedulespark/calendar/core` entrypoint, `styles.css`, and event/recurrence/layout logic are unchanged.
- Added drag-to-create (`onEventCreate`), Ctrl/Cmd+drag copy (`onEventCopy`), and resource column show/hide (click a resource header to hide it, click its chip in the toggle strip to show it again; `hideEmptyResources` auto-hides resources with no events in view by default, always overridden by a manual choice).
- The interactive playground (`src/playground/`, `./playground` and `./playground.css` exports) is rewritten to vanilla too — same toolbar, event-color panel, and "How to do that" guide, now driven by `createCalendar`/`createPlayground` instead of React state. Guide code samples updated to the new API.
- `apps/web`'s admin scheduling view (`ScheduleShiftCalendar.tsx`) and the public playground route (`CalendarPlaygroundPage.tsx`) are migrated to the vanilla API via a small local `useVanillaCalendar`/ref-and-effect wrapper, since they're React pages embedding a now-vanilla widget.
- Fixed month view rendering days in the wrong weekday columns — `.sscal__month-week` row wrappers had no layout rule, so the grid's 7-column template applied to the 6 week-wrapper divs instead of the 42 day cells, misaligning every date and leaving the last column empty. Row wrappers now use `display: contents` so day cells participate directly in the grid.
- Fixed month view colored events missing their left accent border — the base `.sscal__month-event` class never set `border-left-style`/`border-left-width`, so the inline `borderLeftColor` had no visible effect.
- Month view week rows now share equal height (`grid-auto-rows: 1fr`) instead of each row sizing independently to its own content.
- Month view event chips (timed and all-day) now share a consistent minimum height instead of all-day chips looking shorter than timed chips.
- Added README screenshots (day, week, and month views) and a drag-and-drop demo GIF.
- Fixed the playground's default event color toolbar swatch showing a color that wasn't actually applied — events rendered white until the swatch was manually changed. The playground now initializes `defaultEventColor` to match the swatch shown.
- Playground demo events now each use a distinct color from the suggested palette instead of sharing one default color.
- Fixed `setOptions()` corrupting the instance when passed invalid or required-field-clearing values (e.g. `{ interactive: true, snapMinutes: -5 }` or `{ date: undefined }`) — such calls now throw without mutating internal state, so a rejected update no longer permanently breaks subsequent renders.
- `setOptions()`/`setEvents()`/`setDate()`/`setView()` rebuilds now preserve the horizontal scroll position instead of resetting it to the start.
- Rejected keyboard interactions (a resize that would violate `minimumDurationMinutes`, or a move/resize that would overlap another event under `collisionPolicy: "reject-overlap"`) are now announced via a visually hidden `aria-live` status region, since keyboard/assistive-technology users previously had no feedback that the key press did nothing.
- `apps/web`'s `useVanillaCalendar` hook now catches `createCalendar`/`mount`/`setOptions` failures and surfaces them as a visible error state instead of letting them crash the page.
- README screenshots switched from PNG to higher-fidelity JPG assets for npm/jsDelivr rendering.

## 0.0.1-beta-1-0-0

- Default event, "today" highlight, and focus-ring colors now derive from the consuming app's brand token via CSS custom properties instead of the package's built-in defaults, when the app overrides `--sscal-today`/`--sscal-today-surface` and passes a `defaultEventColor` value.
- The calendar container and event blocks now use a rounded, shadowed card treatment (`.sscal` gets `border-radius`/`box-shadow`; `.sscal__event` radius increased from 4px to 6px).
- Fixed `getMonthEventStyle` producing invalid CSS when given a non-hex color value (e.g. a CSS `var(...)` reference) — it now uses `color-mix()` for non-hex input while keeping the existing hex-alpha behavior for hex colors.

## 0.0.1-beta-0-0-1

- Prepared the package metadata for public beta publishing.
- Added React calendar views for day, week, work-week, month, all-day rows, resource lanes, drag and resize interactions, recurrence expansion, and keyboard/accessibility support.
- Added headless core utilities for visible range calculation and event layout.

## Release Notes Process

For each future release:

1. Add an entry above the previous release.
2. Summarize user-facing changes, API changes, fixes, and migration notes.
3. Link relevant Linear issues or pull requests when available.
4. Confirm the package version separately before publishing.
