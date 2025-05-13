
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`} suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
