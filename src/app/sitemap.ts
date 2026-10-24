import type { MetadataRoute } from "next";
import { PAGES } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = siteUrl();
  return Object.values(PAGES).map((p) => ({ url: `${site}${p.path === "/" ? "/" : p.path}`, changeFrequency: "monthly", priority: p.priority, lastModified: new Date("2026-10-23") }));
}
