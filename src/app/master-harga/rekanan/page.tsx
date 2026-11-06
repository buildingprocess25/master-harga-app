import { redirect } from "next/navigation";
import { ROLE_UNPARK, requireInternal } from "../_lib/require-internal";

/**
 * Rute lama Rekanan Parked. Daftar parked kini ada di workspace masing-masing role
 * (menu sidebar), jadi rute ini hanya mengalihkan.
 */
export default async function RekananParkedLamaPage() {
  const user = await requireInternal(ROLE_UNPARK);
  redirect(user.role === "SB_SPECIALIST" ? "/sb-specialist/rekanan-parked" : "/regional-manager/rekanan-parked");
}
