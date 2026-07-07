import InvitacionClient from "./invitacion-client";

export function generateStaticParams() {
  return [{ qr_token: "00000000-0000-0000-0000-000000000000" }];
}

export default function InvitacionPage() {
  return <InvitacionClient />;
}
