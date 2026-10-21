import type { NextConfig } from "next";

const dev = process.env.NODE_ENV === "development";

/** Content Security Policy. The browser test-call page also needs Vapi + Daily (the WebRTC layer Vapi uses). */
function csp(voice: boolean) {
  return [
    "default-src 'self'",
    // Next.js needs inline bootstrap scripts; dev mode also needs eval for hot reload.
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}${voice ? " https://c.daily.co https://*.daily.co" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self' https: blob:", // call recordings stored by Vapi
    `connect-src 'self'${dev ? " ws:" : ""}${voice ? " https://api.vapi.ai wss://api.vapi.ai https://*.daily.co wss://*.daily.co" : ""}`,
    `worker-src 'self' blob:`,
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

const common = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  experimental: { serverActions: { bodySizeLimit: "5mb" }, optimizePackageImports: ["lucide-react"] },
  async headers() {
    return [
      // Later entries override earlier ones for the same header.
      { source: "/:path*", headers: [...common, { key: "Content-Security-Policy", value: csp(false) }, { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" }] },
      { source: "/app/test-call", headers: [{ key: "Content-Security-Policy", value: csp(true) }, { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" }] },
      // The public landing page is indexed; the portal, sign-in and API never are.
      { source: "/app/:path*", headers: noindex },
      { source: "/app", headers: noindex },
      { source: "/login/:path*", headers: noindex },
      { source: "/login", headers: noindex },
      { source: "/setup-mfa", headers: noindex },
      { source: "/api/:path*", headers: noindex },
    ];
  },
};

export default nextConfig;
