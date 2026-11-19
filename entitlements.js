/* Feature gating. Every paid-or-optional feature is checked through hasFeature(name), and nowhere else.
   During the free test phase everything is on for everyone. When a paid plan exists, this is the single
   place to change (for example by reading a plan from a signed-in account). There are no payments in v2. */
(function (root) {
"use strict";
const ENTITLEMENTS = { coach: true };

/* `ents` is injectable so tests can simulate a plan without the feature. Unknown features are off. */
function hasFeature(name, ents) {
  const e = ents || ENTITLEMENTS;
  return Object.prototype.hasOwnProperty.call(e, name) && e[name] === true;
}

const API = { ENTITLEMENTS, hasFeature };
if (typeof module !== "undefined" && module.exports) module.exports = API; else { root.RecallEntitlements = API; root.hasFeature = hasFeature; }
})(typeof self !== "undefined" ? self : this);
