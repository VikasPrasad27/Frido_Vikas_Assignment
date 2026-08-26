import './globals.css';

export const metadata = {
  title: 'ReturnDesk - Store Support & Returns Management',
  description:
    'Production returns desk application for managing customer returns, resolutions, replacements, and refunds.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900 selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
