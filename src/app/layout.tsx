import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const ui = Manrope({ subsets: ["latin"], variable: "--font-ui", display: "swap" });

const site = siteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "MultiVoice Calling Agent: AI inbound & outbound phone calls", template: "%s · MultiVoice" },
  description:
    "An AI voice agent that answers inbound calls and runs outbound campaigns 24/7: answers questions from your documents, books appointments, schedules callbacks and logs everything in a built-in CRM.",
  applicationName: "MultiVoice Calling Agent",
  keywords: ["AI voice agent", "AI calling agent", "inbound calls", "outbound calls", "voice AI CRM", "Vapi", "Twilio", "appointment booking"],
  openGraph: { type: "website", siteName: "MultiVoice", url: "/", title: "MultiVoice Calling Agent", description: "AI voice agent for inbound and outbound calls, with a CRM portal." },
  twitter: { card: "summary_large_image", title: "MultiVoice Calling Agent", description: "AI voice agent for inbound and outbound calls, with a CRM portal." },
  alternates: { canonical: "/" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#2563eb", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={ui.variable}>
      <body className="antialiased">
        <div aria-hidden className="canvas" />
        {children}
      </body>
    </html>
  );
}
