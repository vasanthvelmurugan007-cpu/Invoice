import { getCurrentUser } from "../lib/auth-utils";
import BillingSaaS from "./BillingSaaS";

export default async function Page() {
  const user = await getCurrentUser();
  return <BillingSaaS user={user} />;
}
