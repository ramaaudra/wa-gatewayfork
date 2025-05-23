// This file patches Node.js deprecated util.isArray with Array.isArray
// to fix the deprecation warning

import util from "util";

// Only patch if it's not already patched
if (util.isArray && util.isArray !== Array.isArray) {
  util.isArray = Array.isArray;
  console.log("[Patch] Replaced deprecated util.isArray with Array.isArray");
}

export default {};
