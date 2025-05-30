import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Changed path to local
import { AuthProvider } from '../src/context/AuthContext'; // Corrected path

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Sweet Dreams Music',
  description: 'Where Passion Meets Professionalism', // You can change this as needed
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Bungee&display=swap"
          rel="stylesheet"
        />
      </head>
      {/* Ensure bg-background, text-foreground, and font-sans are defined in globals.css / tailwind config */}
      <body className="min-h-screen bg-background text-foreground font-sans">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
} 