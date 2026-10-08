import type { Metadata } from 'next';
import { PublicPortfolio } from '@/features/portfolio/portfolio';
export const metadata: Metadata = { title: 'Praveen Kumar Kuntolla — Video Editor & Content Creative', description: 'Visual stories with rhythm, purpose and impact. Video editing, social content and creative direction by Praveen Kumar Kuntolla.', robots: { index: true, follow: true } };
export default function Home() { return <PublicPortfolio />; }
