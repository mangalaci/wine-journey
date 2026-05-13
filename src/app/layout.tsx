import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import localFont from "next/font/local";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  style: ["normal", "italic"],
  weight: ["400", "600", "700"],
});

const chilidog = localFont({
  src: [
    {
      path: "./fonts/ChilidogPB-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/ChilidogPB-Regular.woff",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/ChilidogPB-Regular.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-chilidog",
});

export const metadata: Metadata = {
  title: "Borangolo",
  description: "Fedezd fel az ízlésedet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu">
      <body className={`${dmSans.variable} ${playfair.variable} ${chilidog.variable} min-h-dvh font-sans antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(r=>r.forEach(sw=>sw.unregister()))}` }} />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
