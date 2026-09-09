import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CrimeLens — AI-Powered Criminal Network Analysis System',
  description: 'Forensic criminal network analysis, knowledge graph intelligence, and spatial investigative corkboard powered by AI.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full bg-noir-900 text-noir-200 antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
