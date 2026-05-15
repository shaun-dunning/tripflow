import {
  INVITE_CODE,
  DEMO_INVITE_CODE,
  APP_PREVIEW_INVITE_CODES,
} from "@/lib/tripConfig";
import JoinPageClient from "./JoinPageClient";

// Pre-render all known invite codes at build time for static export.
// Unknown codes fall back to a 404 at the file-system level.
export function generateStaticParams() {
  return [
    { code: INVITE_CODE },
    { code: DEMO_INVITE_CODE },
    ...APP_PREVIEW_INVITE_CODES.map((code) => ({ code })),
  ];
}

export const dynamicParams = false;

export default function JoinPage() {
  return <JoinPageClient />;
}
