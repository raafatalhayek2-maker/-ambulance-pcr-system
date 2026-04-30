import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'PCR Pilot — DEMO',
  description: 'PCR Pilot — DEMO ONLY ePCR demo. Sample data only. Not for real patient information.',
  applicationName: 'PCR Pilot',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0B5FFF',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
