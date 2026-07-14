import { getPurchases } from "../../actions/purchases";
import PurchasesClient from "./PurchasesClient";
import DashboardLayout from "../DashboardLayout";

export default async function PurchasesPage() {
  const res = await getPurchases();

  const purchases = (res.purchases || []) as any;
  const businessGstin = res.businessGstin || null;

  return (
    <DashboardLayout>
      <PurchasesClient initialPurchases={purchases} businessGstin={businessGstin} />
    </DashboardLayout>
  );
}
