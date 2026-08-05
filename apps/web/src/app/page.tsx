import { redirect } from "next/navigation";
import { DEFAULT_APP_HOME } from "@/lib/feature-flags";

export default function HomePage() {
  redirect(DEFAULT_APP_HOME);
}
