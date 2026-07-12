import { defineConfig, type Plugin } from "vite";

// Inject a strict Content-Security-Policy into the *built* HTML only. The dev
// server needs inline styles / a websocket for HMR, so we don't constrain it;
// the deployed site (the one real users load) gets the locked-down policy.
// The build emits CSS as an external file and sets no inline styles, so we don't
// need 'unsafe-inline' anywhere: scripts and styles are both 'self' only.
function strictCsp(): Plugin {
  const csp = [
    "default-src 'self'",
    "script-src 'self'", // no inline/remote scripts, kills XSS execution
    "style-src 'self'", // external stylesheet only; no inline styles
    "img-src 'self' data:",
    "connect-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
  return {
    name: "marginalia-strict-csp",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(
        "</title>",
        `</title>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`,
      );
    },
  };
}

// Relative base ("./") so the built site works whether it's served from a
// user/organization Pages root (user.github.io) or a project subpath
// (user.github.io/marginalia/), no repo name to hardcode.
export default defineConfig({
  base: "./",
  plugins: [strictCsp()],
  build: {
    target: "es2021",
    sourcemap: true,
  },
  test: {
    // Default to the fast node environment; the DOM test opts into jsdom via a
    // `// @vitest-environment jsdom` docblock at the top of that file.
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
  },
});
