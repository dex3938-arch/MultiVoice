import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const site = siteUrl();

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${site}/`, changeFrequency: "monthly", priority: 1 }];
}
