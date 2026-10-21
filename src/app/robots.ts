import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const site = siteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/api", "/login", "/setup-mfa"] }],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
