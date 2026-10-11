import type { Metadata } from 'next';
import { Studio } from '@/features/portfolio/studio';
import { requirePermission } from '@/features/back-office/server';
import { redirect } from 'next/navigation';
export const metadata: Metadata = { title: 'PK Studio — Back Office', robots: { index: false, follow: false } };
export default async function StudioPage() { try{await requirePermission('view_back_office');}catch{redirect('/studio/login');}return <Studio />; }
