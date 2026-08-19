import type { Metadata } from "next";

export const metadata: Metadata = { title: "Client Delivery Administration", robots: { index: false, follow: false, noarchive: true }, openGraph: { images: [] }, twitter: { images: [] } };

export default function AdminDeliveryLayout({ children }: { children: React.ReactNode }) { return children; }
