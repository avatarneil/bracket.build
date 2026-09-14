import type { Metadata } from "next";
import { AccountEditor } from "@/components/account/AccountEditor";
export const metadata: Metadata = { title: "Edit bracket | bracket.build" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <AccountEditor id={(await params).id} />;
}
