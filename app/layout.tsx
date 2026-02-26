import type { Metadata } from "next";
import { Exo_2, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { Providers } from "./providers";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { GlobalPromoStrip } from "./components/GlobalPromoStrip";

const exo2 = Exo_2({
  variable: "--font-exo2",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.digital4d.eu";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "digital4d - 3D Печат и Моделиране",
    template: "%s | digital4d",
  },
  description: "Професионални услуги за 3D печат, моделиране и прототипиране. Висококачествени 3D принтери, материали и персонализирани решения за вашите проекти.",
  keywords: ["3D печат", "3D принтиране", "3D моделиране", "прототипиране", "3D принтер", "PLA", "ABS", "PETG", "digital4d"],
  authors: [{ name: "digital4d" }],
  creator: "digital4d",
  publisher: "digital4d",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "bg_BG",
    alternateLocale: ["en_US", "es_ES"],
    url: siteUrl,
    siteName: "digital4d",
    title: "digital4d - 3D Печат и Моделиране",
    description: "Професионални услуги за 3D печат, моделиране и прототипиране. Висококачествени решения за вашите проекти.",
  },
  twitter: {
    card: "summary_large_image",
    title: "digital4d - 3D Печат и Моделиране",
    description: "Професионални услуги за 3D печат, моделиране и прототипиране.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${exo2.variable} ${inter.variable} antialiased`}
        suppressHydrationWarning
      >
        {/* JSON-LD: Organization + WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "digital4d",
                url: siteUrl,
                logo: `${siteUrl}/favicon.ico`,
                description: "Professional 3D printing, modeling and prototyping services. High-quality 3D printers, materials and customized solutions.",
                contactPoint: {
                  "@type": "ContactPoint",
                  email: "contact@digital4d.bg",
                  contactType: "customer service",
                  availableLanguage: ["Bulgarian", "English", "Spanish"],
                },
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "digital4d",
                url: siteUrl,
                potentialAction: {
                  "@type": "SearchAction",
                  target: {
                    "@type": "EntryPoint",
                    urlTemplate: `${siteUrl}/products?search={search_term_string}`,
                  },
                  "query-input": "required name=search_term_string",
                },
              },
            ]),
          }}
        />
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <GlobalPromoStrip />
            {children}
          </Providers>
          <SpeedInsights />
          <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
