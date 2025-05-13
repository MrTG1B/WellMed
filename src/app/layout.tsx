
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

const pillIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(180, 100%, 25.1%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>`;
const faviconDataUri = `data:image/svg+xml;base64,${Buffer.from(pillIconSvg).toString('base64')}`;


export const metadata: Metadata = {
  title: 'WellMeds - Your Medicine Information Hub',
  description: 'Search for medicine details by name, enhanced by AI with WellMeds. Supports multiple languages.',
  keywords: 'medicine, search, pharmacy, health, AI, multilingual, Paracetamol, Amoxicillin, WellMeds',
  icons: {
    icon: faviconDataUri,
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`} suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

