import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'QR Code Management System',
  description: 'Generate, track, and print customized QR codes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
