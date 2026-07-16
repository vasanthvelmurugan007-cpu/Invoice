import { pgTable, uuid, text, timestamp, integer, numeric, boolean, date, jsonb, varchar, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Tenants represent client businesses
export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessName: text('business_name').notNull(),
  gstin: text('gstin'),
  ownerId: uuid('owner_id').notNull(), // references Supabase auth.users
  createdAt: timestamp('created_at').defaultNow(),
});

// Auditor client connections
export const auditorClients = pgTable('auditor_clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  auditorId: uuid('auditor_id').notNull(),   // references auth.users
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  permissionLevel: text('permission_level')  // 'view' | 'download' | 'comment'
    .notNull().default('view'),
  status: text('status').notNull().default('pending'), // 'pending' | 'active' | 'revoked'
  inviteToken: text('invite_token').unique(),
  inviteEmail: text('invite_email').notNull(),
  invitedAt: timestamp('invited_at').defaultNow(),
  acceptedAt: timestamp('accepted_at'),
});

// Monthly period lock
export const monthlyPeriods = pgTable('monthly_periods', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  periodMonth: integer('period_month').notNull(), // 1-12
  periodYear: integer('period_year').notNull(),
  status: text('status').notNull().default('open'), // 'open' | 'locked' | 'filed'
  lockedAt: timestamp('locked_at'),
  lockedBy: uuid('locked_by'), // auth.users id
  filedAt: timestamp('filed_at'),
  filedBy: uuid('filed_by'),
});

// Purchases / Expense register
export const purchases = pgTable('purchases', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  vendorName: text('vendor_name').notNull(),
  vendorGstin: text('vendor_gstin'),
  invoiceNumber: text('invoice_number').notNull(),
  invoiceDate: date('invoice_date').notNull(),
  taxableAmount: numeric('taxable_amount', { precision: 12, scale: 2 }).notNull(),
  cgst: numeric('cgst', { precision: 12, scale: 2 }).default('0'),
  sgst: numeric('sgst', { precision: 12, scale: 2 }).default('0'),
  igst: numeric('igst', { precision: 12, scale: 2 }).default('0'),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  hsnCode: text('hsn_code'),
  hsnRate: integer('hsn_rate'),
  category: text('category'), // 'goods' | 'services'
  itcEligible: boolean('itc_eligible').default(true),
  status: text('status').notNull().default('confirmed'), // 'pending_review' | 'confirmed'
  createdAt: timestamp('created_at').defaultNow(),
});

export const tenantWhatsappNumbers = pgTable('tenant_whatsapp_numbers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  phoneNumber: text('phone_number').notNull(), // E.164
  verified: boolean('verified').default(false),
  verifiedAt: timestamp('verified_at'),
  verificationCode: text('verification_code'),
  codeExpiresAt: timestamp('code_expires_at'),
  verificationAttempts: integer('verification_attempts').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueVerifiedPhoneIdx: uniqueIndex('tenant_whatsapp_verified_phone_idx')
    .on(table.phoneNumber)
    .where(sql`verified = true`),
}));

export const whatsappProcessedMessages = pgTable('whatsapp_processed_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  messageId: text('message_id').notNull().unique(),
  processedAt: timestamp('processed_at').defaultNow(),
});

// Audit trail
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  actorId: uuid('actor_id').notNull(), // auth.users id
  actorRole: text('actor_role').notNull(), // 'owner' | 'auditor'
  action: text('action').notNull(), // 'viewed_invoices' | 'downloaded_gstr1' | 'locked_period' | 'filed'
  periodMonth: integer('period_month'),
  periodYear: integer('period_year'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

// GST filing packages
export const gstFilingPackages = pgTable('gst_filing_packages', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  preparedBy: uuid('prepared_by').notNull(), // CA's auth.users id
  periodMonth: integer('period_month').notNull(),
  periodYear: integer('period_year').notNull(),
  filingType: varchar('filing_type', { length: 20 }).notNull().default('GSTR-1'), // 'GSTR-1' | 'GSTR-3B'
  version: integer('version').notNull().default(1),
  status: text('status').notNull().default('draft'), // 'draft' | 'validated' | 'uploaded' | 'acknowledged'
  validationErrors: jsonb('validation_errors'),
  gstr1Url: text('gstr1_url'),
  gstr3bUrl: text('gstr3b_url'),
  hsnSummaryUrl: text('hsn_summary_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueFilingIdx: uniqueIndex('gst_filing_packages_tenant_period_type_idx').on(
    table.tenantId, table.periodMonth, table.periodYear, table.filingType
  ),
}));

// Invoices
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  invoiceDate: date('invoice_date').notNull(),
  dueDate: date('due_date'),
  customerName: text('customer_name').notNull(),
  type: text('type').notNull().default('Invoice'), // 'Invoice' | 'DC' | 'Proforma' | 'CreditNote'
  hidePriceForDc: boolean('hide_price_for_dc').default(false),
  dcNumber: text('dc_number'),
  dcDate: date('dc_date'),
  vehicleNumber: text('vehicle_number'),
  items: jsonb('items').notNull(), // Array of items
  hsnRate: integer('hsn_rate'), // Snapshot for invoice level (if single rate) or fallback
  deliveryCharge: numeric('delivery_charge', { precision: 12, scale: 2 }).default('0'),
  packagingCharge: numeric('packaging_charge', { precision: 12, scale: 2 }).default('0'),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  status: text('status').notNull().default('Unpaid'), // 'Paid' | 'Unpaid' | 'Delivered'
  createdAt: timestamp('created_at').defaultNow(),
});

// Customers
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  gstin: text('gstin'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  pincode: text('pincode'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Products
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  hsn: text('hsn'),
  unit: text('unit').notNull().default('NOS'),
  rate: numeric('rate', { precision: 12, scale: 2 }).notNull(),
  taxRate: integer('tax_rate').notNull().default(5),
  createdAt: timestamp('created_at').defaultNow(),
});

export const hsnMaster = pgTable('hsn_master', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 8 }).notNull(), // Removed .unique()
  description: text('description').notNull(),
  gstRate: integer('gst_rate').notNull(), // stored as percentage x 100, e.g. 18% = 1800
  type: varchar('type', { length: 3 }).notNull(), // 'HSN' | 'SAC'
  effectiveFrom: date('effective_from').notNull().defaultNow(),
  effectiveTo: date('effective_to'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueCodeDateIdx: uniqueIndex('hsn_code_effective_from_idx').on(table.code, table.effectiveFrom),
}));
