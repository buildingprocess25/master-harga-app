import { ROLE_UNPARK, requireInternal } from "../_lib/require-internal";
import { KontenRekananParked } from "@/components/kuorum/KontenRekananParked";

export default async function RekananParkedPage() {
  const user = await requireInternal(ROLE_UNPARK);
  return <KontenRekananParked user={user} />;
}
