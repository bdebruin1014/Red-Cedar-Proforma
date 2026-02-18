-- ============================================================
-- RCH DEAL ANALYZER — Supabase Migration
-- Run this in your Supabase SQL Editor (hcneetymvattlgbgarbg)
-- ============================================================

-- 1. DEALS TABLE
CREATE TABLE IF NOT EXISTS public.sl_deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  -- Property Info
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'SC',
  zip TEXT NOT NULL,
  subdivision TEXT,
  jurisdiction TEXT,
  lot_acres NUMERIC(6,3),
  zoning TEXT,
  notes TEXT,

  -- Lot Basis
  lot_purchase_price NUMERIC(12,2) NOT NULL,
  closing_costs NUMERIC(12,2) DEFAULT 2500,
  acquisition_comm NUMERIC(12,2) DEFAULT 0,
  due_diligence NUMERIC(12,2) DEFAULT 1500,
  other_acq_costs NUMERIC(12,2) DEFAULT 500,

  -- Timing & Rates
  duration_days INTEGER DEFAULT 150,
  interest_rate NUMERIC(6,4) DEFAULT 0.0975,
  cost_of_capital_rate NUMERIC(6,4) DEFAULT 0.16,

  -- Floor Plan
  plan_name TEXT NOT NULL,
  plan_sf INTEGER NOT NULL,
  plan_bed INTEGER,
  plan_bath INTEGER,
  plan_garage TEXT,
  plan_stories INTEGER,
  plan_width TEXT,
  s_and_b NUMERIC(12,2) NOT NULL,

  -- Contract Costs (fixed per skill)
  site_specific NUMERIC(12,2) DEFAULT 10875,
  soft_costs NUMERIC(12,2) DEFAULT 2650,
  contingency NUMERIC(12,2) DEFAULT 11000,
  rch_builder_fee NUMERIC(12,2) DEFAULT 17500,

  -- Upgrades
  hardie_color_plus NUMERIC(12,2) DEFAULT 0,
  elevation_upgrade NUMERIC(12,2) DEFAULT 0,
  interior_package NUMERIC(12,2) DEFAULT 0,
  interior_package_name TEXT,
  misc_upgrades NUMERIC(12,2) DEFAULT 0,

  -- Municipality Soft Costs
  water_tap NUMERIC(12,2) DEFAULT 0,
  sewer_sssd NUMERIC(12,2) DEFAULT 0,
  sewer_tap NUMERIC(12,2) DEFAULT 0,
  building_permit NUMERIC(12,2) DEFAULT 0,
  plan_review NUMERIC(12,2) DEFAULT 0,
  trade_permits NUMERIC(12,2) DEFAULT 0,
  other_muni_costs NUMERIC(12,2) DEFAULT 0,

  -- Additional Site Work
  additional_site_work NUMERIC(12,2) DEFAULT 5000,

  -- RCH Fixed House Costs
  builder_warranty NUMERIC(12,2) DEFAULT 5000,
  builders_risk NUMERIC(12,2) DEFAULT 1500,
  po_fee NUMERIC(12,2) DEFAULT 3000,
  pm_fee NUMERIC(12,2) DEFAULT 3500,
  rch_am_fee NUMERIC(12,2) DEFAULT 5000,
  utility_charges NUMERIC(12,2),  -- calculated: ceil(duration/30) * 350
  misc_fixed NUMERIC(12,2) DEFAULT 11000,

  -- Sales
  asp NUMERIC(12,2) NOT NULL,
  selling_cost_pct NUMERIC(6,4) DEFAULT 0.085,
  selling_concessions NUMERIC(12,2) DEFAULT 5000,

  -- Status
  status TEXT DEFAULT 'analyzed' CHECK (status IN ('draft', 'analyzed', 'approved', 'declined', 'closed', 'archived')),
  recommendation TEXT CHECK (recommendation IN ('PROCEED', 'PROCEED WITH CAUTION', 'DECLINE'))
);

-- 2. DEAL RESULTS TABLE (computed outputs)
CREATE TABLE IF NOT EXISTS public.sl_deal_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID REFERENCES public.sl_deals(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Computed Totals
  total_lot_basis NUMERIC(12,2),
  total_contract_cost NUMERIC(12,2),
  total_upgrades NUMERIC(12,2),
  total_muni_soft_costs NUMERIC(12,2),
  total_rch_fixed_house NUMERIC(12,2),
  total_project_cost NUMERIC(12,2),

  -- Financing
  loan_amount NUMERIC(12,2),
  equity_required NUMERIC(12,2),
  interest_carry NUMERIC(12,2),
  cost_of_capital_carry NUMERIC(12,2),
  total_carry NUMERIC(12,2),
  total_all_in_cost NUMERIC(12,2),

  -- Returns
  selling_costs NUMERIC(12,2),
  net_sales_proceeds NUMERIC(12,2),
  net_profit NUMERIC(12,2),
  npm NUMERIC(6,4),
  land_cost_ratio NUMERIC(6,4),
  breakeven_asp NUMERIC(12,2),
  min_asp_5pct NUMERIC(12,2),

  -- Sensitivity
  best_case_profit NUMERIC(12,2),
  best_case_npm NUMERIC(6,4),
  worst_case_profit NUMERIC(12,2),
  worst_case_npm NUMERIC(6,4),
  stress_cost_profit NUMERIC(12,2),
  stress_cost_npm NUMERIC(6,4),
  stress_asp_profit NUMERIC(12,2),
  stress_asp_npm NUMERIC(6,4),
  stress_delay_profit NUMERIC(12,2),
  stress_delay_npm NUMERIC(6,4),

  -- Memo
  memo_url TEXT
);

-- 3. COMPS TABLE
CREATE TABLE IF NOT EXISTS public.sl_deal_comps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID REFERENCES public.sl_deals(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  sale_price NUMERIC(12,2),
  price_per_sf NUMERIC(8,2),
  sf INTEGER,
  bed INTEGER,
  bath INTEGER,
  sale_date DATE,
  notes TEXT
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_sl_deals_created_by ON public.sl_deals(created_by);
CREATE INDEX IF NOT EXISTS idx_sl_deals_status ON public.sl_deals(status);
CREATE INDEX IF NOT EXISTS idx_sl_deal_results_deal_id ON public.sl_deal_results(deal_id);
CREATE INDEX IF NOT EXISTS idx_sl_deal_comps_deal_id ON public.sl_deal_comps(deal_id);

-- 5. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_sl_deals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sl_deals_updated_at ON public.sl_deals;
CREATE TRIGGER sl_deals_updated_at
  BEFORE UPDATE ON public.sl_deals
  FOR EACH ROW
  EXECUTE FUNCTION update_sl_deals_updated_at();

-- 6. ROW LEVEL SECURITY
ALTER TABLE public.sl_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sl_deal_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sl_deal_comps ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can see all deals (team visibility)
CREATE POLICY "Authenticated users can view all deals"
  ON public.sl_deals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert deals"
  ON public.sl_deals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own deals"
  ON public.sl_deals FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can view all results"
  ON public.sl_deal_results FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage results"
  ON public.sl_deal_results FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view all comps"
  ON public.sl_deal_comps FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage comps"
  ON public.sl_deal_comps FOR ALL
  TO authenticated
  USING (true);

-- 7. STORAGE BUCKET FOR MEMOS
INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-memos', 'deal-memos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users can read memos
CREATE POLICY "Authenticated users can read memos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'deal-memos');

CREATE POLICY "Service role can upload memos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'deal-memos');
