import type { Metadata } from "next";
import { Outfit, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const outfitFont = Outfit({
  variable: "--font-geist-sans", // Keeping variable name the same so Tailwind hits it
  subsets: ["latin"],
});

const monoFont = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Project: Excelsior",
  description: "AI Fitness Dashboard",
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfitFont.variable} ${monoFont.variable} antialiased font-sans bg-[#050505] text-white`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
