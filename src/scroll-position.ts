/**
 * Reads the horizontal scroll position shared by the header/all-day-row/body regions,
 * so a rebuild (which replaces every DOM node) doesn't visibly jump back to the start.
 */
export function readScrollLeft(host: HTMLElement): number | null {
  const region = host.querySelector(".sscal__columns-scroll");
  return region ? region.scrollLeft : null;
}

/**
 * Restores a previously-read horizontal scroll position onto the freshly rebuilt regions.
 */
export function writeScrollLeft(host: HTMLElement, scrollLeft: number): void {
  for (const region of host.querySelectorAll(".sscal__columns-scroll")) {
    region.scrollLeft = scrollLeft;
  }
}
