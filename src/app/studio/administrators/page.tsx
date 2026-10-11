import type { Metadata } from 'next';
import { AdminManager } from '@/features/back-office/admin-manager';
import { requirePermission } from '@/features/back-office/server';
import { redirect } from 'next/navigation';
export const metadata:Metadata={title:'Administrators — PK Studio',robots:{index:false,follow:false}};
export default async function Page(){try{await requirePermission('invite_admins');}catch{redirect('/studio/login');}return <AdminManager/>;}
