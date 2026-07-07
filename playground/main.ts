import { createPlayground } from "../src/playground";

import "../src/playground/playground.css";
import "../src/playground/shell.css";
import "../src/styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Playground root element not found");
}

createPlayground().mount(root);
