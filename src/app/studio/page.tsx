import type { Metadata } from 'next';
import { Studio } from '@/features/portfolio/studio';
export const metadata: Metadata = { title: 'PK Studio — Back Office', robots: { index: false, follow: false } };
export default function StudioPage() { return <Studio />; }
