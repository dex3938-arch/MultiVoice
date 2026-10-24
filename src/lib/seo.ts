import type { Metadata } from "next";
import { siteUrl } from "./site";

/**
 * The public pages, one place. Each page targets its own search intent: titles, descriptions and keyword
 * sets never repeat across pages (no keyword cannibalisation). Used by page metadata, nav, footer and sitemap.
 */
export const PAGES = {
  home: {
    teaser: "Overview of the calling agent",
    path: "/",
    nav: "Home",
    title: "MultiVoice: AI Calling Agent for Inbound & Outbound Phone Calls",
    description: "AI calling agent that answers inbound calls, runs outbound campaigns, books appointments and logs every conversation in its own CRM.",
    keywords: ["AI calling agent", "AI phone agent", "voice AI for business", "AI call automation"],
    priority: 1,
  },
  features: {
    teaser: "Every capability, screen by screen",
    path: "/features",
    nav: "Features",
    title: "Voice Agent Features: Knowledge Base, Booking, Transcripts & CRM",
    description: "Answers from your PDFs and FAQs, appointment booking, callbacks, transcripts, recordings, summaries and a live lead dashboard.",
    keywords: ["voice agent features", "AI call transcripts", "AI appointment booking", "conversational AI knowledge base"],
    priority: 0.9,
  },
  inbound: {
    teaser: "How the receptionist handles callers",
    path: "/inbound-call-answering",
    nav: "Inbound",
    title: "AI Receptionist: 24/7 Inbound Call Answering for Small Businesses",
    description: "Never miss a customer call: an AI receptionist answers day and night, replies from your documents and books visits.",
    keywords: ["AI receptionist", "inbound call answering", "24/7 answering service", "virtual phone receptionist"],
    priority: 0.9,
  },
  outbound: {
    teaser: "Rules the dialer follows",
    path: "/outbound-calling",
    nav: "Outbound",
    title: "Automated Outbound Calling Campaigns with Consent & Calling Hours",
    description: "Outbound AI call campaigns that respect consent, Do-Not-Call lists, calling hours, retries and a monthly budget.",
    keywords: ["outbound calling software", "automated call campaigns", "AI lead follow-up calls", "auto dialer with AI"],
    priority: 0.9,
  },
  integrations: {
    teaser: "Providers and automatic failover",
    path: "/integrations",
    nav: "Integrations",
    title: "Vapi, Twilio & Dograh Integration with Automatic Provider Failover",
    description: "How Vapi, Twilio, Dograh, Supabase and Vercel fit together, and how calls switch to a backup provider when credits run out.",
    keywords: ["Vapi integration", "Twilio voice AI", "Dograh voice agent", "voice provider failover"],
    priority: 0.8,
  },
  security: {
    teaser: "How call data is protected",
    path: "/security",
    nav: "Security",
    title: "Security & Privacy: MFA, Roles, Audit Logs and Encrypted Data",
    description: "Two-factor sign-in, role-based access, audit trails, signed webhooks and row-level database security for call data.",
    keywords: ["secure voice AI", "call data privacy", "two-factor authentication CRM", "GDPR-ready call recording"],
    priority: 0.7,
  },
  faq: {
    teaser: "Costs, limits and setup questions",
    path: "/faq",
    nav: "FAQ",
    title: "AI Calling Agent FAQ: Setup, Costs, Languages and Limits",
    description: "Setup time, per-minute costs, languages, concurrent calls, document limits and compliance, answered plainly.",
    keywords: ["AI calling agent FAQ", "voice bot cost per minute", "how AI phone agents work", "AI call compliance"],
    priority: 0.7,
  },
} as const;

export type PageKey = keyof typeof PAGES;

/** The share image (app/opengraph-image.tsx); listed explicitly because page metadata replaces the inherited one. */
const OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "MultiVoice AI calling agent" };

export function pageMetadata(key: PageKey): Metadata {
  const p = PAGES[key];
  return {
    title: { absolute: p.title },
    description: p.description,
    keywords: [...p.keywords],
    alternates: { canonical: p.path },
    openGraph: { type: "website", siteName: "MultiVoice", url: p.path, title: p.title, description: p.description, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title: p.title, description: p.description, images: [OG_IMAGE.url] },
    robots: { index: true, follow: true },
  };
}

/** BreadcrumbList for inner pages. */
export function breadcrumb(key: PageKey) {
  const site = siteUrl();
  const p = PAGES[key];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${site}/` },
      ...(key === "home" ? [] : [{ "@type": "ListItem", position: 2, name: p.nav, item: `${site}${p.path}` }]),
    ],
  };
}
