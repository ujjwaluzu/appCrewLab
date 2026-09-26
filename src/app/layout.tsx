import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CrewLab — Build in good company",
  description: "Find people who want to build the same things you do.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/crewlab-icon.webp", type: "image/webp" },
      { url: "/crewlab-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/crewlab-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/crewlab-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
