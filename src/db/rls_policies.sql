-- Enable RLS on all tenant-scoped tables
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_filing_packages ENABLE ROW LEVEL SECURITY;

-- Owners can see their own tenant data
CREATE POLICY "owner_access_invoices" ON invoices
  FOR ALL USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE owner_id = auth.uid()
    )
  );

-- Auditors can SELECT (read-only) for linked active clients
CREATE POLICY "auditor_read_access_invoices" ON invoices
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM auditor_clients
      WHERE auditor_id = auth.uid() AND status = 'active'
    )
  );

-- Repeat the auditor_read_access policy for: purchases, customers, monthly_periods
CREATE POLICY "owner_access_purchases" ON purchases
  FOR ALL USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "auditor_read_access_purchases" ON purchases
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM auditor_clients
      WHERE auditor_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "owner_access_customers" ON customers
  FOR ALL USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "auditor_read_access_customers" ON customers
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM auditor_clients
      WHERE auditor_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "owner_access_monthly_periods" ON monthly_periods
  FOR ALL USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "auditor_read_access_monthly_periods" ON monthly_periods
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM auditor_clients
      WHERE auditor_id = auth.uid() AND status = 'active'
    )
  );

-- Auditors get full CRUD on gst_filing_packages they created
CREATE POLICY "auditor_own_packages" ON gst_filing_packages
  FOR ALL USING (prepared_by = auth.uid());

CREATE POLICY "owner_access_packages" ON gst_filing_packages
  FOR SELECT USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE owner_id = auth.uid()
    )
  );

-- HSN Master RLS
ALTER TABLE hsn_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hsn_select_policy" ON hsn_master
  FOR SELECT TO authenticated USING (true);

-- Section 2: Trigger for Period Locking (Defense in Depth)
CREATE OR REPLACE FUNCTION check_period_lock() RETURNS trigger AS $$
DECLARE
  period_status varchar;
  inv_date date;
  inv_month int;
  inv_year int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    inv_date := OLD.invoice_date;
  ELSE
    inv_date := NEW.invoice_date;
  END IF;

  inv_month := EXTRACT(MONTH FROM inv_date);
  inv_year := EXTRACT(YEAR FROM inv_date);

  SELECT status INTO period_status
  FROM monthly_periods
  WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
    AND period_month = inv_month
    AND period_year = inv_year
  LIMIT 1;

  IF period_status IN ('locked', 'filed') THEN
    RAISE EXCEPTION 'Cannot modify data for a locked or filed period (Month: %, Year: %)', inv_month, inv_year;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_period_lock_invoices ON invoices;
CREATE TRIGGER trg_check_period_lock_invoices
  BEFORE INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION check_period_lock();

DROP TRIGGER IF EXISTS trg_check_period_lock_purchases ON purchases;
CREATE TRIGGER trg_check_period_lock_purchases
  BEFORE INSERT OR UPDATE OR DELETE ON purchases
  FOR EACH ROW EXECUTE FUNCTION check_period_lock();
