import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://grevitywings.com"),
  title: { default: "Welcome to Grevitywings – A Lead Generation is forever", template: "%s – Welcome to Grevitywings" },
  description: "Grevitywings provides lead generation, hotkey transfer, inbound service, web designing and back-office support.",
  icons: { icon: "/favicon-source.png", shortcut: "/favicon-source.png" },
  openGraph: { title: "Welcome to Grevitywings", description: "Business With Brevity", type: "website", locale: "en_GB", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Grevitywings — Business With Brevity" }] },
  twitter: { card: "summary_large_image", title: "Welcome to Grevitywings", description: "Business With Brevity", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
