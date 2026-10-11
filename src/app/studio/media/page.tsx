import type { Metadata } from 'next';
import { MediaManager } from '@/features/media-library/manager';
import { requirePermission } from '@/features/back-office/server';
import { redirect } from 'next/navigation';
export const metadata: Metadata = { title: 'PK Studio — Media Back Office', robots: { index: false, follow: false } };
// No protected data is rendered here. Every authenticated read/mutation verifies the user in the API.
export default async function MediaPage() { try{await requirePermission('manage_media');}catch{redirect('/studio/login');}return <MediaManager />; }
