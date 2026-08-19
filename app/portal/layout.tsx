import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Delivery Portal",
  description: "Secure Grevitywings client delivery portal.",
  robots: { index: false, follow: false, noarchive: true },
  openGraph: { images: [] },
  twitter: { images: [] },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) { return children; }
