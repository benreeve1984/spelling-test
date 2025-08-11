import type { Metadata } from 'next';
import { inter } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Spelling Test - AI-Powered Learning',
  description: 'An adaptive spelling test application with voice interaction',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}