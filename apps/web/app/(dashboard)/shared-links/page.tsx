import { redirect } from 'next/navigation';

export default function SharedLinksLegacyPage() {
  // Legacy route kept for backward compatibility.
  redirect('/');
}
