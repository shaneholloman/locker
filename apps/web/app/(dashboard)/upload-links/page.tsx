import { redirect } from 'next/navigation';

export default function UploadLinksLegacyPage() {
  // Legacy route kept for backward compatibility.
  redirect('/');
}
