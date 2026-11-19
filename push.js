/* Server-side web push: INTERFACE STUB. Not implemented in v2.

   TODO(phase 2): closed-app reminders. On iOS 16.4+ a Home Screen web app can receive Web Push, but that
   needs a server that stores reminders and sends a push at the right minute (for example a Cloudflare Worker
   cron, a Supabase Edge Function, or a Firebase Cloud Function), a VAPID key pair (private key on the server
   only), and reminders synced to that server. See NEXT_STEPS.md, section 2.

   Until then, reminders fire only while Recall is open. The .ics export is the dependable way to get an
   alert when the app is closed. */
(function (root) {
"use strict";
const PushProvider = {
  /* Would be true once a server is configured. */
  supported() { return false; },
  /* TODO(phase 2): register a push subscription and send it to the server. Resolves to the subscription or null. */
  async subscribe() { return null; },
  /* TODO(phase 2): remove the subscription locally and on the server. */
  async unsubscribe() { return false; },
  /* TODO(phase 2): hand a reminder to the server so it can be delivered while the app is closed. */
  async scheduleRemote(/* { id, at, title } */) { return false; }
};
if (typeof module !== "undefined" && module.exports) module.exports = PushProvider; else root.RecallPush = PushProvider;
})(typeof self !== "undefined" ? self : this);
