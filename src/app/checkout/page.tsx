import { Suspense } from "react";
import { CheckoutClient } from "@/components/CheckoutClient";

export const dynamic = "force-dynamic";

export default function CheckoutPage() {
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
