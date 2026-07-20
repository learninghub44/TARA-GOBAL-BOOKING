import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Defaults are fine for TARA today (no ISR/R2 incremental cache wired up
  // yet). If/when you add on-demand ISR, revisit this and point the cache
  // at an R2 binding — see:
  // https://opennext.js.org/cloudflare/caching
});
