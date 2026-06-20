import { redirect } from "next/navigation";

// ReplyDesk is the flow. The root sends you straight into it.
export default function Home() {
  redirect("/app");
}
