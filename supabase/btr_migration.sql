-- ============================================================
-- RCC BTR PROFORMA — Supabase Migration
-- Run in Supabase SQL Editor (hcneetymvattlgbgarbg)
-- Scoped to RCC as fee-build contractor on BTR projects
-- Vertical only OR Horizontal + Vertical
-- ============================================================

-- 1. ENUM TYPES
DO $$ BEGIN
  CREATE TYPE btr_scope AS ENUM ('vertical_only', 'horizontal_and_vertical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE btr_project_status AS ENUM (
    'intake', 'preliminary_lc', 'exit_dd', 'closing',
    'approved', 'construction', 'lease_up', 'stabilized', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE btr_product_type AS ENUM ('sfh', 'townhome');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE btr_budget_category AS ENUM (
    'land', 'horizontal', 'vertical', 'soft_cost', 'closing_financing'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE btr_forecast_method AS ENUM ('s_curve', 'manual_input', 'straight_line');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE btr_scurve_rate AS ENUM (
    'flat_1', 'moderately_flat_3', 'moderate_5', 'moderately_steep_7', 'steep_9'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE btr_dd_status AS ENUM ('not_started', 'in_progress', 'complete', 'n_a');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE btr_utility_type AS ENUM ('water', 'sewer', 'electric', 'gas', 'telecom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE btr_utility_status AS ENUM ('not_started', 'in_progress', 'committed', 'not_required');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE btr_lc_stage AS ENUM ('preliminary', 'exit_dd', 'closing');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE btr_lc_result AS ENUM (
    'pending', 'approved', 'conditionally_approved', 'deferred', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE btr_milestone_status AS ENUM ('pending', 'on_track', 'at_risk', 'complete', 'n_a');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE btr_contact_role AS ENUM (
    'engineer', 'surveyor', 'geotech', 'environmental', 'zoning_attorney',
    'city_reviewer', 'architect', 'structural_engineer', 'dev_inspector',
    'building_inspector', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. PROJECT CORE TABLES
-- ============================================================

-- (a) btr_projects — master record
CREATE TABLE IF NOT EXISTS public.btr_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  name TEXT NOT NULL,
  scope btr_scope NOT NULL DEFAULT 'vertical_only',
  status btr_project_status DEFAULT 'intake',

  property_type TEXT,  -- TH, SFH, Mixed
  address TEXT,
  city TEXT,
  state TEXT DEFAULT 'SC',
  county TEXT,
  zip TEXT,
  acreage NUMERIC(10,4),

  total_units INTEGER,
  avg_sf_per_unit NUMERIC(8,2),
  avg_rent_per_unit NUMERIC(8,2),
  total_residential_sf NUMERIC(12,2),

  land_purchase_price NUMERIC(14,2),
  current_zoning TEXT,
  entitlement_status TEXT,

  -- BTR operator / developer (RCC's client)
  btr_operator TEXT,
  developer TEXT,
  lender TEXT,

  -- Project timeline
  project_start_date DATE,
  estimated_completion DATE,
  construction_months INTEGER,

  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- (b) btr_lot_matrix — lot types with dimensions
CREATE TABLE IF NOT EXISTS public.btr_lot_matrix (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.btr_projects(id) ON DELETE CASCADE,

  lot_type_name TEXT NOT NULL,
  product_type btr_product_type,
  lot_count INTEGER,
  lot_width NUMERIC(6,1),
  lot_depth NUMERIC(6,1),
  side_setback NUMERIC(6,1),
  front_setback NUMERIC(6,1),
  rear_setback NUMERIC(6,1),
  pad_width NUMERIC(6,1),
  pad_depth NUMERIC(6,1),
  load_type TEXT,  -- Front load, Rear load
  sort_order INTEGER DEFAULT 0
);

-- (c) btr_product_mix — floor plans mapped to lot types
CREATE TABLE IF NOT EXISTS public.btr_product_mix (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.btr_projects(id) ON DELETE CASCADE,
  lot_type_id UUID REFERENCES public.btr_lot_matrix(id) ON DELETE SET NULL,

  plan_name TEXT NOT NULL,
  unit_count INTEGER NOT NULL DEFAULT 1,
  heated_sf INTEGER,
  bedrooms INTEGER,
  bathrooms NUMERIC(3,1),
  garage_type TEXT,

  target_rent_monthly NUMERIC(8,2),
  base_cost NUMERIC(14,2),         -- S&B per unit
  adder_soft_costs NUMERIC(14,2),  -- additional/soft per unit
  rc_fee_per_unit NUMERIC(14,2),   -- RCC builder fee per unit (HIDDEN)
  total_vertical_cost NUMERIC(14,2),

  sort_order INTEGER DEFAULT 0
);

-- ============================================================
-- 3. FINANCIAL MODEL TABLES
-- ============================================================

-- (a) btr_development_budget — line-item costs with S-curve params
CREATE TABLE IF NOT EXISTS public.btr_development_budget (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.btr_projects(id) ON DELETE CASCADE,

  category btr_budget_category NOT NULL,
  line_item_name TEXT NOT NULL,

  per_unit_amount NUMERIC(14,2),
  total_amount NUMERIC(14,2),
  per_sf_amount NUMERIC(8,2),
  pct_of_total NUMERIC(6,4),

  forecast_method btr_forecast_method DEFAULT 's_curve',
  start_month INTEGER DEFAULT 0,
  duration_months INTEGER DEFAULT 1,
  s_curve_rate btr_scurve_rate DEFAULT 'moderate_5',
  end_month INTEGER,
  monthly_distribution JSONB,

  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  is_included BOOLEAN DEFAULT true
);

-- (b) btr_financing — construction and permanent loan layers
CREATE TABLE IF NOT EXISTS public.btr_financing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.btr_projects(id) ON DELETE CASCADE,

  layer_type TEXT NOT NULL,  -- construction_loan, permanent_loan, land_loan, mezzanine
  lender_name TEXT,
  amount NUMERIC(14,2),
  ltc_or_ltv_pct NUMERIC(6,4),
  interest_rate NUMERIC(6,4),
  term_months INTEGER,
  amortization_months INTEGER,
  origination_fee_pct NUMERIC(6,4),
  exit_fee_pct NUMERIC(6,4),
  interest_reserve NUMERIC(14,2),
  funding_method TEXT DEFAULT 'equity_first',
  day_count_basis INTEGER DEFAULT 360,
  sort_order INTEGER DEFAULT 0,
  notes TEXT
);

-- (c) btr_income_assumptions — rent, vacancy, opex
CREATE TABLE IF NOT EXISTS public.btr_income_assumptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.btr_projects(id) ON DELETE CASCADE,

  assumption_category TEXT NOT NULL,  -- unit_rent, vacancy, concessions, other_income, operating_expense, reserve, pm_fee
  line_item_name TEXT NOT NULL,
  unit_count INTEGER,
  monthly_amount NUMERIC(14,2),
  annual_amount NUMERIC(14,2),
  pct_of_revenue NUMERIC(6,4),
  per_unit_amount NUMERIC(8,2),
  escalation_rate NUMERIC(6,4) DEFAULT 0.03,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- (d) btr_vertical_timeline — unit starts per month
CREATE TABLE IF NOT EXISTS public.btr_vertical_timeline (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.btr_projects(id) ON DELETE CASCADE,

  months_to_build_one_unit INTEGER DEFAULT 5,
  month_number INTEGER NOT NULL,
  units_started INTEGER DEFAULT 0,
  units_delivered INTEGER,
  cumulative_delivered INTEGER,
  lease_up_units INTEGER
);

-- (e) btr_monthly_cashflows — projected monthly cashflows
CREATE TABLE IF NOT EXISTS public.btr_monthly_cashflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.btr_projects(id) ON DELETE CASCADE,

  month_number INTEGER NOT NULL,
  period_date DATE,

  construction_draw_total NUMERIC(14,2),
  equity_cashflow NUMERIC(14,2),
  construction_loan_cashflow NUMERIC(14,2),
  cumulative_construction_debt NUMERIC(14,2),
  debt_service_io NUMERIC(14,2),

  units_delivered INTEGER,
  units_rented INTEGER,
  physical_occupancy NUMERIC(6,4),
  gross_rent NUMERIC(14,2),
  vacancy_loss NUMERIC(14,2),
  other_income NUMERIC(14,2),
  total_revenue NUMERIC(14,2),
  operating_expenses NUMERIC(14,2),
  noi NUMERIC(14,2),
  net_cashflow NUMERIC(14,2),

  metadata JSONB DEFAULT '{}'::jsonb
);

-- (f) btr_rc_fee_profile — RCC fee calculations (HIDDEN from public)
CREATE TABLE IF NOT EXISTS public.btr_rc_fee_profile (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.btr_projects(id) ON DELETE CASCADE,

  fee_type TEXT NOT NULL,  -- builder_fee, staffed_positions, cm_fee, developer_fee, other
  is_included BOOLEAN DEFAULT false,
  per_unit_amount NUMERIC(14,2),
  total_amount NUMERIC(14,2),
  fee_structure TEXT,  -- cost_plus, gmp, flat, percentage
  notes TEXT
);

-- (g) btr_calculated_returns — project-level metrics
CREATE TABLE IF NOT EXISTS public.btr_calculated_returns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.btr_projects(id) ON DELETE CASCADE UNIQUE,

  total_cost_basis NUMERIC(14,2),
  total_equity_required NUMERIC(14,2),
  stabilized_noi NUMERIC(14,2),
  yield_on_cost NUMERIC(6,4),
  stabilized_value NUMERIC(14,2),
  value_delta NUMERIC(14,2),
  rc_total_fee_income NUMERIC(14,2),
  refi_cap_rate NUMERIC(6,4),
  dscr NUMERIC(6,4),

  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. QUESTIONNAIRE / INTAKE TABLES
-- ============================================================

-- (a) btr_due_diligence — DD checklist items
CREATE TABLE IF NOT EXISTS public.btr_due_diligence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.btr_projects(id) ON DELETE CASCADE,

  category TEXT NOT NULL,  -- environmental, survey, geotech, title, legal, engineering, permits, utility, other
  item_name TEXT NOT NULL,
  status btr_dd_status DEFAULT 'not_started',
  due_date DATE,
  completed_date DATE,
  responsible_party TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0
);

-- (b) btr_utility_capacity — utility provider tracking
CREATE TABLE IF NOT EXISTS public.btr_utility_capacity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.btr_projects(id) ON DELETE CASCADE,

  utility_type btr_utility_type NOT NULL,
  provider_name TEXT,
  status btr_utility_status DEFAULT 'not_started',
  due_date DATE,
  estimated_fees NUMERIC(14,2),
  notes TEXT
);

-- (c) btr_contacts — project team contacts
CREATE TABLE IF NOT EXISTS public.btr_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.btr_projects(id) ON DELETE CASCADE,

  role btr_contact_role NOT NULL,
  company_name TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT
);

-- ============================================================
-- 5. WORKFLOW TABLES
-- ============================================================

-- (a) btr_land_committee — LC approvals
CREATE TABLE IF NOT EXISTS public.btr_land_committee (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.btr_projects(id) ON DELETE CASCADE,

  stage btr_lc_stage NOT NULL,
  submitted_date DATE,
  presentation_date DATE,
  presenter TEXT,
  result btr_lc_result DEFAULT 'pending',
  conditions TEXT,
  sign_offs JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

-- (b) btr_milestones — project milestone schedule
CREATE TABLE IF NOT EXISTS public.btr_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.btr_projects(id) ON DELETE CASCADE,

  milestone_number INTEGER,
  milestone_name TEXT NOT NULL,
  responsible_party TEXT,
  target_date DATE,
  actual_date DATE,
  status btr_milestone_status DEFAULT 'pending',
  notes TEXT
);

-- (c) btr_contracts — acquisition and fee-build contracts
CREATE TABLE IF NOT EXISTS public.btr_contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.btr_projects(id) ON DELETE CASCADE,

  contract_type TEXT NOT NULL,  -- acquisition, fee_build, construction
  seller_or_client TEXT,
  buyer_or_builder TEXT,
  effective_date DATE,
  deposit_amount NUMERIC(14,2),
  inspection_period_exp DATE,
  outside_closing_date DATE,
  is_gmp BOOLEAN DEFAULT false,
  pace_units_per_month INTEGER,
  is_executed BOOLEAN DEFAULT false,
  key_terms TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================
-- 6. BID MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS public.btr_site_bids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.btr_projects(id) ON DELETE CASCADE,

  contractor_name TEXT NOT NULL,
  bid_date DATE,
  bid_amount NUMERIC(14,2),
  is_selected BOOLEAN DEFAULT false,
  scope_notes TEXT,
  notes TEXT,
  document_url TEXT
);

-- ============================================================
-- 7. RENT COMPS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.btr_rent_comps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.btr_projects(id) ON DELETE CASCADE,

  comp_number INTEGER,
  project_name TEXT NOT NULL,
  address TEXT,
  city_state TEXT,
  distance_miles NUMERIC(6,2),
  min_sf INTEGER,
  max_sf INTEGER,
  min_rent NUMERIC(8,2),
  max_rent NUMERIC(8,2),
  avg_rent NUMERIC(8,2),
  avg_sf INTEGER,
  adjusted_rent NUMERIC(8,2),
  variance_to_subject NUMERIC(8,2),
  variance_pct NUMERIC(6,4),
  adjustments JSONB DEFAULT '[]'::jsonb,
  notes TEXT
);

-- ============================================================
-- 8. REFERENCE DATA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.btr_ref_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name TEXT NOT NULL,
  plan_type TEXT,  -- sfh, townhome
  heated_sf INTEGER,
  unheated_sf INTEGER,
  bedrooms INTEGER,
  bathrooms NUMERIC(3,1),
  garage_type TEXT,
  floors NUMERIC(3,1),
  pad_size TEXT,
  sticks_bricks NUMERIC(14,2),
  site_specific NUMERIC(14,2),
  soft_costs NUMERIC(14,2),
  total_cost NUMERIC(14,2),
  cost_per_heated_sf NUMERIC(8,2),
  line_items JSONB,
  county TEXT,
  import_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.btr_ref_county_fees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  county TEXT NOT NULL,
  state TEXT DEFAULT 'SC',
  fee_category TEXT NOT NULL,
  fee_name TEXT NOT NULL,
  amount NUMERIC(14,2),
  amount_low NUMERIC(14,2),
  amount_high NUMERIC(14,2),
  provider TEXT,
  phone TEXT,
  effective_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true
);

-- ============================================================
-- 9. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_btr_projects_status ON public.btr_projects(status);
CREATE INDEX IF NOT EXISTS idx_btr_projects_created_by ON public.btr_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_btr_lot_matrix_project ON public.btr_lot_matrix(project_id);
CREATE INDEX IF NOT EXISTS idx_btr_product_mix_project ON public.btr_product_mix(project_id);
CREATE INDEX IF NOT EXISTS idx_btr_dev_budget_project ON public.btr_development_budget(project_id);
CREATE INDEX IF NOT EXISTS idx_btr_financing_project ON public.btr_financing(project_id);
CREATE INDEX IF NOT EXISTS idx_btr_income_project ON public.btr_income_assumptions(project_id);
CREATE INDEX IF NOT EXISTS idx_btr_timeline_project ON public.btr_vertical_timeline(project_id);
CREATE INDEX IF NOT EXISTS idx_btr_cashflows_project ON public.btr_monthly_cashflows(project_id);
CREATE INDEX IF NOT EXISTS idx_btr_fees_project ON public.btr_rc_fee_profile(project_id);
CREATE INDEX IF NOT EXISTS idx_btr_dd_project ON public.btr_due_diligence(project_id);
CREATE INDEX IF NOT EXISTS idx_btr_milestones_project ON public.btr_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_btr_bids_project ON public.btr_site_bids(project_id);
CREATE INDEX IF NOT EXISTS idx_btr_comps_project ON public.btr_rent_comps(project_id);

-- ============================================================
-- 10. UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_btr_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS btr_projects_updated_at ON public.btr_projects;
CREATE TRIGGER btr_projects_updated_at
  BEFORE UPDATE ON public.btr_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_btr_projects_updated_at();

-- ============================================================
-- 11. ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all BTR tables
ALTER TABLE public.btr_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btr_lot_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btr_product_mix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btr_development_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btr_financing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btr_income_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btr_vertical_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btr_monthly_cashflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btr_rc_fee_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btr_calculated_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btr_due_diligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btr_utility_capacity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btr_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btr_land_committee ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btr_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btr_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btr_site_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btr_rent_comps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btr_ref_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btr_ref_county_fees ENABLE ROW LEVEL SECURITY;

-- Team-wide read access for authenticated users
DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'btr_projects', 'btr_lot_matrix', 'btr_product_mix',
    'btr_development_budget', 'btr_financing', 'btr_income_assumptions',
    'btr_vertical_timeline', 'btr_monthly_cashflows',
    'btr_calculated_returns', 'btr_due_diligence', 'btr_utility_capacity',
    'btr_contacts', 'btr_land_committee', 'btr_milestones', 'btr_contracts',
    'btr_site_bids', 'btr_rent_comps', 'btr_ref_plans', 'btr_ref_county_fees'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "auth_select_%s" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_insert_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_update_%s" ON public.%I FOR UPDATE TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_delete_%s" ON public.%I FOR DELETE TO authenticated USING (true)', t, t);
  END LOOP;
END $$;

-- RC fee profile: restrict to admin role (hidden from general users)
-- For now, all authenticated users can see fees. 
-- When you add role-based access, tighten this to admin only:
-- DROP POLICY "auth_select_btr_rc_fee_profile" ON public.btr_rc_fee_profile;
-- CREATE POLICY "admin_select_btr_rc_fee_profile" ON public.btr_rc_fee_profile
--   FOR SELECT TO authenticated
--   USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'));

-- ============================================================
-- 12. STORAGE BUCKET FOR BTR DOCUMENTS
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('btr-documents', 'btr-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth_read_btr_docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'btr-documents');

CREATE POLICY "auth_upload_btr_docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'btr-documents');
