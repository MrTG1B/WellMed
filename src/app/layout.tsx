
import type {Metadata} from 'next';
import { Geist, Geist_Mono } from 'next/font/google'; 
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; 

const geistSans = Geist({ 
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({ 
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'WellMeds - Your Medicine Information Hub',
  description: 'Search for medicine details by name, enhanced by AI with WellMeds. Supports multiple languages.',
  keywords: 'medicine, search, pharmacy, health, AI, multilingual, Paracetamol, Amoxicillin, WellMeds',
  icons: {
    icon: '/images/logo.png', // Updated to use the logo from public/images
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#008080" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="WellMeds" />
        {/* You can add apple-touch-icon links here if you have specific iOS icons */}
        {/* e.g., <link rel="apple-touch-icon" href="/images/apple-icon-180x180.png" /> */}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`} suppressHydrationWarning>
        {children}
        <Toaster />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').then(registration => {
                    console.log('WellMeds SW registered: ', registration);
                  }).catch(registrationError => {
                    console.log('WellMeds SW registration failed: ', registrationError);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
