import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const ui = Manrope({ subsets: ["latin"], variable: "--font-ui", display: "swap" });

const site = siteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "MultiVoice Calling Agent", template: "%s · MultiVoice" },
  description: "AI calling agent with a built-in CRM.",
  applicationName: "MultiVoice Calling Agent",
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
