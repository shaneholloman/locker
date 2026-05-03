import { defineConfig } from "wxt";

const PROD_WEB_HOST = "https://locker.dev";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: ".",
  dev: {
    // Web app owns 3000; move WXT's dev server.
    server: { port: 3101 },
  },
  manifest: ({ mode }) => {
    // Dev builds default to localhost; production builds default to the
    // canonical Locker origin. Override via WXT_PUBLIC_LOCKER_WEB_HOST when
    // building against a staging environment.
    const isDev = mode === "development";
    const webHost =
      process.env.WXT_PUBLIC_LOCKER_WEB_HOST ??
      (isDev ? "http://localhost:3000" : PROD_WEB_HOST);

    // The /extension-signin page on the web host bounces users back to
    // auth-complete.html, so MV3 needs that bounce target declared. We always
    // include the production origin so a build that gets pointed at staging
    // still permits returns from locker.dev tabs. Localhost is added only
    // for dev so production builds don't smuggle a localhost match.
    const bounceMatches = Array.from(
      new Set([
        `${webHost}/*`,
        `${PROD_WEB_HOST}/*`,
        ...(isDev ? ["http://localhost:3000/*"] : []),
      ]),
    );

    return {
      name: "Locker",
      description: "Pick files from your Locker workspace anywhere on the web.",
      // Surfaced as the "Website" link on the Chrome Web Store listing.
      homepage_url: PROD_WEB_HOST,
      permissions: ["storage", "activeTab", "scripting", "tabs"],
      // Need broad host access so the file-input intercept content script can
      // run on any page, and the SW can hit the Locker API regardless of host.
      host_permissions: ["<all_urls>"],
      action: { default_popup: "popup.html", default_title: "Locker" },
      web_accessible_resources: [
        {
          resources: ["auth-complete.html"],
          matches: bounceMatches,
        },
      ],
    };
  },
});
