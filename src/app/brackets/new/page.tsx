import type { Metadata } from "next";
import { AccountEditor } from "@/components/account/AccountEditor";
export const metadata: Metadata = { title: "New bracket | bracket.build" };
export default function Page() {
  return <AccountEditor />;
}
