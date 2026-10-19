import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import m0001 from '../migrations/0001_ledger.sql' with { type: 'text' }
import m0002 from '../migrations/0002_number_sequences.sql' with { type: 'text' }
import m0003 from '../migrations/0003_auth.sql' with { type: 'text' }
import m0004 from '../migrations/0004_sales.sql' with { type: 'text' }
import m0005 from '../migrations/0005_purchases.sql' with { type: 'text' }
import m0006 from '../migrations/0006_customer_created_at.sql' with { type: 'text' }
import m0007 from '../migrations/0007_inventory.sql' with { type: 'text' }
import m0008 from '../migrations/0008_fixed_assets.sql' with { type: 'text' }
import m0009 from '../migrations/0009_returns.sql' with { type: 'text' }
import m0010 from '../migrations/0010_down_payments.sql' with { type: 'text' }
import m0011 from '../migrations/0011_purchase_down_payments.sql' with { type: 'text' }
import m0012 from '../migrations/0012_purchase_orders.sql' with { type: 'text' }
import m0013 from '../migrations/0013_item_adjustments.sql' with { type: 'text' }
import m0014 from '../migrations/0014_asset_disposals.sql' with { type: 'text' }
import m0015 from '../migrations/0015_purchase_requisitions.sql' with { type: 'text' }
import m0016 from '../migrations/0016_sales_orders.sql' with { type: 'text' }
import m0017 from '../migrations/0017_warehouses.sql' with { type: 'text' }
import m0018 from '../migrations/0018_exchange_invoices.sql' with { type: 'text' }
import m0019 from '../migrations/0019_employee_loans.sql' with { type: 'text' }
import m0020 from '../migrations/0020_cash_documents.sql' with { type: 'text' }
import m0021 from '../migrations/0021_master_lists.sql' with { type: 'text' }
import m0022 from '../migrations/0022_sales_tax.sql' with { type: 'text' }
import m0023 from '../migrations/0023_purchase_tax.sql' with { type: 'text' }
import m0024 from '../migrations/0024_spt_masa.sql' with { type: 'text' }
import m0025 from '../migrations/0025_customer_credit_limit.sql' with { type: 'text' }
import m0026 from '../migrations/0026_receipt_cheques.sql' with { type: 'text' }
import m0027 from '../migrations/0027_selling_price_adjustments.sql' with { type: 'text' }
import m0028 from '../migrations/0028_sales_targets.sql' with { type: 'text' }
import m0029 from '../migrations/0029_installments.sql' with { type: 'text' }
import m0030 from '../migrations/0030_bank_reconciliation.sql' with { type: 'text' }
import m0031 from '../migrations/0031_purchase_expenses.sql' with { type: 'text' }
import m0032 from '../migrations/0032_expense_accruals.sql' with { type: 'text' }
import m0033 from '../migrations/0033_vendor_prices.sql' with { type: 'text' }
import m0034 from '../migrations/0034_foreign_currency.sql' with { type: 'text' }
import m0035 from '../migrations/0035_item_groups.sql' with { type: 'text' }
import m0036 from '../migrations/0036_serial_numbers.sql' with { type: 'text' }
import m0037 from '../migrations/0037_fixed_asset_edits.sql' with { type: 'text' }
import m0038 from '../migrations/0038_fiscal_assets.sql' with { type: 'text' }
import m0039 from '../migrations/0039_unrealized_gain.sql' with { type: 'text' }
import m0040 from '../migrations/0040_activity_log.sql' with { type: 'text' }
import m0041 from '../migrations/0041_retail_inventory.sql' with { type: 'text' }
import m0042 from '../migrations/0042_dimensions.sql' with { type: 'text' }
import m0043 from '../migrations/0043_salesmen.sql' with { type: 'text' }
import m0044 from '../migrations/0044_job_costing.sql' with { type: 'text' }
import m0045 from '../migrations/0045_sales_quotations.sql' with { type: 'text' }
import m0046 from '../migrations/0046_approvals.sql' with { type: 'text' }
import m0047 from '../migrations/0047_budgets.sql' with { type: 'text' }
import m0048 from '../migrations/0048_costing_method.sql' with { type: 'text' }
import m0049 from '../migrations/0049_stock_move_exact_value.sql' with { type: 'text' }
import m0050 from '../migrations/0050_project_budgets.sql' with { type: 'text' }
import m0051 from '../migrations/0051_report_preferences.sql' with { type: 'text' }
import m0052 from '../migrations/0052_contractor_projects.sql' with { type: 'text' }
import m0053 from '../migrations/0053_job_costing_adjustments.sql' with { type: 'text' }
import m0054 from '../migrations/0054_transfer_orders.sql' with { type: 'text' }
import m0055 from '../migrations/0055_access_groups.sql' with { type: 'text' }
import m0056 from '../migrations/0056_pph_withholding.sql' with { type: 'text' }
import m0057 from '../migrations/0057_payroll.sql' with { type: 'text' }
import m0058 from '../migrations/0058_access_enforcement.sql' with { type: 'text' }
import m0059 from '../migrations/0059_loan_disbursements.sql' with { type: 'text' }

export function connect(url = process.env.DATABASE_URL, opts: postgres.Options<{}> = {}) {
  if (!url) throw new Error('DATABASE_URL is required')
  const client = postgres(url, { max: 10, onnotice: () => {}, ...opts })
  return { client, db: drizzle(client) }
}
export type Db = ReturnType<typeof connect>['db']
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

// Embedded so `bun build --compile` carries them; add new files here in order.
const MIGRATIONS: Record<string, string> = { '0001_ledger.sql': m0001, '0002_number_sequences.sql': m0002, '0003_auth.sql': m0003, '0004_sales.sql': m0004, '0005_purchases.sql': m0005, '0006_customer_created_at.sql': m0006, '0007_inventory.sql': m0007, '0008_fixed_assets.sql': m0008, '0009_returns.sql': m0009, '0010_down_payments.sql': m0010, '0011_purchase_down_payments.sql': m0011, '0012_purchase_orders.sql': m0012, '0013_item_adjustments.sql': m0013, '0014_asset_disposals.sql': m0014, '0015_purchase_requisitions.sql': m0015, '0016_sales_orders.sql': m0016, '0017_warehouses.sql': m0017, '0018_exchange_invoices.sql': m0018, '0019_employee_loans.sql': m0019, '0020_cash_documents.sql': m0020, '0021_master_lists.sql': m0021, '0022_sales_tax.sql': m0022, '0023_purchase_tax.sql': m0023, '0024_spt_masa.sql': m0024, '0025_customer_credit_limit.sql': m0025, '0026_receipt_cheques.sql': m0026, '0027_selling_price_adjustments.sql': m0027, '0028_sales_targets.sql': m0028, '0029_installments.sql': m0029, '0030_bank_reconciliation.sql': m0030, '0031_purchase_expenses.sql': m0031, '0032_expense_accruals.sql': m0032, '0033_vendor_prices.sql': m0033, '0034_foreign_currency.sql': m0034, '0035_item_groups.sql': m0035, '0036_serial_numbers.sql': m0036, '0037_fixed_asset_edits.sql': m0037, '0038_fiscal_assets.sql': m0038, '0039_unrealized_gain.sql': m0039, '0040_activity_log.sql': m0040, '0041_retail_inventory.sql': m0041, '0042_dimensions.sql': m0042, '0043_salesmen.sql': m0043, '0044_job_costing.sql': m0044, '0045_sales_quotations.sql': m0045, '0046_approvals.sql': m0046, '0047_budgets.sql': m0047, '0048_costing_method.sql': m0048, '0049_stock_move_exact_value.sql': m0049, '0050_project_budgets.sql': m0050, '0051_report_preferences.sql': m0051, '0052_contractor_projects.sql': m0052, '0053_job_costing_adjustments.sql': m0053, '0054_transfer_orders.sql': m0054, '0055_access_groups.sql': m0055, '0056_pph_withholding.sql': m0056, '0057_payroll.sql': m0057, '0058_access_enforcement.sql': m0058, '0059_loan_disbursements.sql': m0059 }

/** Applies migrations in name order, once each. Hand-written SQL because triggers and deferred constraints are the point. */
export async function migrate(client: postgres.Sql) {
  await client`CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`
  const done = new Set((await client`SELECT name FROM _migrations`).map(r => r.name as string))
  for (const f of Object.keys(MIGRATIONS).sort()) {
    if (done.has(f)) continue
    await client.begin(async tx => {
      await tx.unsafe(MIGRATIONS[f]!)
      await tx`INSERT INTO _migrations (name) VALUES (${f})`
    })
  }
}
