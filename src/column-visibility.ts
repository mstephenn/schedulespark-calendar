/**
 * Tracks per-resource column show/hide state as calendar-owned UI state (not part of
 * `CalendarOptions`), so a manual toggle always overrides `hideEmptyResources` and survives
 * `setOptions`/`setEvents` rebuilds within the same instance.
 */
export interface ColumnVisibilityController {
  isVisible: (resourceId: string, hasEvents: boolean, hideEmptyResources: boolean) => boolean;
  hide: (resourceId: string) => void;
  show: (resourceId: string) => void;
}

/**
 * Creates a `ColumnVisibilityController`. `rerender` is invoked after every `hide`/`show`
 * so the calendar-owning `createCalendar` instance can rebuild with the new visibility state.
 */
export function createColumnVisibility(rerender: () => void): ColumnVisibilityController {
  const overrides = new Map<string, boolean>();
  return {
    isVisible(resourceId, hasEvents, hideEmptyResources) {
      const override = overrides.get(resourceId);
      if (override !== undefined) return override;
      return hideEmptyResources ? hasEvents : true;
    },
    hide(resourceId) {
      overrides.set(resourceId, false);
      rerender();
    },
    show(resourceId) {
      overrides.set(resourceId, true);
      rerender();
    }
  };
}
