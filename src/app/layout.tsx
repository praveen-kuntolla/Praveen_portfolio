import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Praveen Kumar Kuntolla — Portfolio', template: '%s · PK Studio' },
  description: 'Video editing, visual storytelling and social content by Praveen Kumar Kuntolla.',
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
