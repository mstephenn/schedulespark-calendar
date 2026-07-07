export interface ScrollSyncController {
  /** Registers a horizontally-scrollable element to keep in sync with the others. */
  register: (element: HTMLElement) => void;
}

/**
 * Keeps multiple horizontal scroll regions aligned (header, all-day row, time grid).
 * Each render pass creates a fresh controller and registers its own scroll elements —
 * plain DOM element references, so there's no cross-component ref-forwarding involved.
 */
export function createScrollSync(): ScrollSyncController {
  const regions: HTMLElement[] = [];
  let propagatedScrollLeft: number | null = null;

  /**
   * Registers a scrollable element and wires it to propagate its scrollLeft to the others.
   */
  function register(element: HTMLElement): void {
    const index = regions.length;
    regions.push(element);
    element.addEventListener("scroll", () => {
      onScroll(element, index);
    });
  }

  /**
   * Propagates one region's scrollLeft to every other registered region.
   */
  function onScroll(source: HTMLElement, sourceIndex: number): void {
    const { scrollLeft } = source;
    if (scrollLeft === propagatedScrollLeft) return;

    propagatedScrollLeft = scrollLeft;
    regions.forEach((region, regionIndex) => {
      if (regionIndex !== sourceIndex) region.scrollLeft = scrollLeft;
    });
  }

  return { register };
}
