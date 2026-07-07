/* eslint-disable jsdoc/require-jsdoc -- Private DOM builders stay documented at the exported-function level only. */
import { PLAYGROUND_GUIDE_SECTIONS } from "./playground-guide-sections";

import type { PlaygroundGuideSection } from "./playground-guide-sections";

/**
 * Builds the static "How to do that" guide documenting each playground control.
 */
export function buildPlaygroundGuide(): HTMLElement {
  const section = document.createElement("section");
  section.className = "playground__guide";
  section.setAttribute("aria-labelledby", "playground-guide-title");

  const intro = document.createElement("div");
  intro.className = "playground__guide-intro";
  const heading = document.createElement("h2");
  heading.id = "playground-guide-title";
  heading.textContent = "How to do that";
  const introText = document.createElement("p");
  const introControlled = document.createElement("strong");
  introControlled.textContent = "controlled";
  const introCode = document.createElement("code");
  introCode.textContent = "onDraftChange";
  introText.append(
    "Use the toolbar above to experiment, then copy the matching patterns into your app. The calendar is ",
    introControlled,
    " — you own event data and apply changes from ",
    introCode,
    "."
  );
  intro.append(heading, introText);

  const sections = document.createElement("div");
  sections.className = "playground__guide-sections";
  for (const guideSection of PLAYGROUND_GUIDE_SECTIONS) {
    sections.appendChild(buildGuideSection(guideSection));
  }

  const footer = document.createElement("p");
  footer.className = "playground__guide-footer";
  const docsLink = document.createElement("a");
  docsLink.href = "https://github.com/mstephenn/schedulespark/tree/beta/packages/calendar";
  docsLink.textContent = "packages/calendar/README.md";
  const betaLink = document.createElement("a");
  betaLink.href = "https://beta.schedulespark.com/register";
  betaLink.textContent = "beta.schedulespark.com/register";
  footer.append("Package docs: ", docsLink, ". Full app beta: ", betaLink);

  section.append(intro, sections, footer);
  return section;
}

function buildGuideSection(guideSection: PlaygroundGuideSection): HTMLElement {
  const details = document.createElement("details");
  details.className = "playground__guide-section";

  const summary = document.createElement("summary");
  summary.className = "playground__guide-summary";
  summary.textContent = guideSection.title;

  const body = document.createElement("div");
  body.className = "playground__guide-body";

  const tryIt = document.createElement("p");
  tryIt.className = "playground__guide-try";
  const tryItLabel = document.createElement("strong");
  tryItLabel.textContent = "In this preview:";
  tryIt.append(tryItLabel, ` ${guideSection.tryIt}`);

  const codeLabel = document.createElement("p");
  codeLabel.className = "playground__guide-label";
  codeLabel.textContent = "In your app:";

  const pre = document.createElement("pre");
  pre.className = "playground__guide-code";
  const code = document.createElement("code");
  code.textContent = guideSection.code;
  pre.appendChild(code);

  body.append(tryIt, codeLabel, pre);
  details.append(summary, body);
  return details;
}
