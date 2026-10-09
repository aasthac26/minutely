import { Rocket } from "lucide-react";
import Link from "next/link";

export default async function ComingSoon({
  searchParams,
}: { searchParams: Promise<{ feature?: string }> }) {
  const { feature = "This feature" } = await searchParams;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Rocket /></div>
      <h1 className="text-2xl font-extrabold">{feature} is coming soon</h1>
      <p className="text-sm text-muted">This is a placeholder in the demo. Real bots, calendar and CRM integrations are out of scope.</p>
      <Link href="/" className="btn-primary mt-2">Back to meetings</Link>
    </div>
  );
}