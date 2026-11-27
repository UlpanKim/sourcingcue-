import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CheckoutClient } from "@/components/CheckoutClient";
import { getServerSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; cycle?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  if (typeof params.plan === "string" && params.plan.trim()) {
    qs.set("plan", params.plan.trim());
  }
  if (typeof params.cycle === "string" && params.cycle.trim()) {
    qs.set("cycle", params.cycle.trim());
  }
  const queryString = qs.toString();
  const checkoutPath = queryString ? `/checkout?${queryString}` : "/checkout";

  const session = await getServerSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(checkoutPath)}`);
  }

  const bootpayClientKey =
    process.env.BOOTPAY_CLIENT_KEY?.trim() ||
    process.env.NEXT_PUBLIC_BOOTPAY_WEB_APP_ID?.trim() ||
    "";

  return (
    <Suspense fallback={<div className="p-12 text-center text-sm font-bold">불러오는 중...</div>}>
      <CheckoutClient bootpayClientKey={bootpayClientKey} />
    </Suspense>
  );
}
