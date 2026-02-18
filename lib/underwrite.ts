// ============================================================
// RCH Deal Analyzer — Underwriting Engine
// Pure calculation, no side effects
// ============================================================

export interface DealInputs {
  // Lot Basis
  lot_purchase_price: number
  closing_costs: number
  acquisition_comm: number
  due_diligence: number
  other_acq_costs: number

  // Timing & Rates
  duration_days: number
  interest_rate: number
  cost_of_capital_rate: number

  // Floor Plan
  plan_name: string
  plan_sf: number
  s_and_b: number

  // Contract (defaults from skill)
  site_specific: number  // 10875
  soft_costs: number     // 2650
  contingency: number    // 11000
  rch_builder_fee: number // 17500

  // Upgrades
  hardie_color_plus: number
  elevation_upgrade: number
  interior_package: number
  misc_upgrades: number

  // Municipality Soft Costs
  water_tap: number
  sewer_sssd: number
  sewer_tap: number
  building_permit: number
  plan_review: number
  trade_permits: number
  other_muni_costs: number

  // Additional Site Work
  additional_site_work: number

  // RCH Fixed House Costs
  builder_warranty: number   // 5000
  builders_risk: number      // 1500
  po_fee: number             // 3000
  pm_fee: number             // 3500
  rch_am_fee: number         // 5000
  misc_fixed: number         // 11000

  // Sales
  asp: number
  selling_cost_pct: number   // 0.085
  selling_concessions: number
}

export interface DealResults {
  total_lot_basis: number
  total_contract_cost: number
  total_upgrades: number
  total_muni_soft_costs: number
  total_rch_fixed_house: number
  utility_charges: number
  total_project_cost: number

  loan_amount: number
  equity_required: number
  interest_carry: number
  cost_of_capital_carry: number
  total_carry: number
  total_all_in_cost: number

  selling_costs: number
  net_sales_proceeds: number
  net_profit: number
  npm: number
  land_cost_ratio: number
  breakeven_asp: number
  min_asp_5pct: number

  // Sensitivity
  best_case_profit: number
  best_case_npm: number
  worst_case_profit: number
  worst_case_npm: number
  stress_cost_profit: number
  stress_cost_npm: number
  stress_asp_profit: number
  stress_asp_npm: number
  stress_delay_profit: number
  stress_delay_npm: number

  recommendation: 'PROCEED' | 'PROCEED WITH CAUTION' | 'DECLINE'
  npm_label: string
  land_label: string
}

function calcScenario(
  totalProjectCost: number,
  asp: number,
  sellingCostPct: number,
  sellingConcessions: number,
  interestRate: number,
  cocRate: number,
  durationDays: number,
  costMult: number,
  aspMult: number,
  extraDays: number
) {
  const adjProjectCost = totalProjectCost * costMult
  const adjLoan = adjProjectCost * 0.85
  const adjEquity = adjProjectCost - adjLoan
  const adjDays = durationDays + extraDays
  const adjInterest = adjLoan * (interestRate / 360) * adjDays
  const adjCoC = adjEquity * (cocRate / 360) * adjDays
  const adjAllIn = adjProjectCost + adjInterest + adjCoC
  const adjASP = asp * aspMult
  const adjSellingCosts = adjASP * sellingCostPct
  const adjNet = adjASP - adjSellingCosts - sellingConcessions - adjAllIn
  return { profit: adjNet, npm: adjNet / adjASP }
}

export function npmLabel(npm: number): string {
  if (npm > 0.10) return 'STRONG'
  if (npm >= 0.07) return 'GOOD'
  if (npm >= 0.05) return 'MARGINAL'
  return 'NO GO'
}

export function landLabel(ratio: number): string {
  if (ratio < 0.20) return 'STRONG'
  if (ratio <= 0.25) return 'ACCEPTABLE'
  if (ratio <= 0.30) return 'CAUTION'
  return 'OVERPAYING'
}

export function underwrite(inputs: DealInputs): DealResults {
  const totalLotBasis = inputs.lot_purchase_price + inputs.closing_costs +
    inputs.acquisition_comm + inputs.due_diligence + inputs.other_acq_costs

  const totalContractCost = inputs.s_and_b + inputs.site_specific +
    inputs.soft_costs + inputs.contingency + inputs.rch_builder_fee

  const totalUpgrades = inputs.hardie_color_plus + inputs.elevation_upgrade +
    inputs.interior_package + inputs.misc_upgrades

  const totalMuniSoftCosts = inputs.water_tap + inputs.sewer_sssd +
    inputs.sewer_tap + inputs.building_permit + inputs.plan_review +
    inputs.trade_permits + inputs.other_muni_costs

  const utilityCharges = Math.ceil(inputs.duration_days / 30) * 350

  const totalRCHFixedHouse = inputs.builder_warranty + inputs.builders_risk +
    inputs.po_fee + inputs.pm_fee + inputs.rch_am_fee + utilityCharges + inputs.misc_fixed

  const totalProjectCost = totalLotBasis + totalContractCost + totalUpgrades +
    totalMuniSoftCosts + inputs.additional_site_work + totalRCHFixedHouse

  const loan = totalProjectCost * 0.85
  const equity = totalProjectCost - loan
  const interest = loan * (inputs.interest_rate / 360) * inputs.duration_days
  const costOfCapital = equity * (inputs.cost_of_capital_rate / 360) * inputs.duration_days
  const totalCarry = interest + costOfCapital
  const totalAllInCost = totalProjectCost + totalCarry

  const sellingCosts = inputs.asp * inputs.selling_cost_pct
  const netSalesProceeds = inputs.asp - sellingCosts - inputs.selling_concessions
  const netProfit = netSalesProceeds - totalAllInCost
  const npm = netProfit / inputs.asp
  const landCostRatio = totalLotBasis / inputs.asp

  const breakEvenASP = totalAllInCost / (1 - inputs.selling_cost_pct)
  const minASP5 = totalAllInCost / (1 - inputs.selling_cost_pct - 0.05)

  // Sensitivity
  const args = [totalProjectCost, inputs.asp, inputs.selling_cost_pct,
    inputs.selling_concessions, inputs.interest_rate, inputs.cost_of_capital_rate,
    inputs.duration_days] as const

  const best = calcScenario(...args, 0.95, 1.05, 0)
  const worst = calcScenario(...args, 1.10, 0.90, 30)
  const s1 = calcScenario(...args, 1.10, 1, 0)
  const s2 = calcScenario(...args, 1, 0.90, 0)
  const s3 = calcScenario(...args, 1, 1, 30)

  const rec = npm >= 0.07 ? 'PROCEED' as const :
    npm >= 0.05 ? 'PROCEED WITH CAUTION' as const : 'DECLINE' as const

  return {
    total_lot_basis: totalLotBasis,
    total_contract_cost: totalContractCost,
    total_upgrades: totalUpgrades,
    total_muni_soft_costs: totalMuniSoftCosts,
    total_rch_fixed_house: totalRCHFixedHouse,
    utility_charges: utilityCharges,
    total_project_cost: totalProjectCost,
    loan_amount: loan,
    equity_required: equity,
    interest_carry: interest,
    cost_of_capital_carry: costOfCapital,
    total_carry: totalCarry,
    total_all_in_cost: totalAllInCost,
    selling_costs: sellingCosts,
    net_sales_proceeds: netSalesProceeds,
    net_profit: netProfit,
    npm,
    land_cost_ratio: landCostRatio,
    breakeven_asp: breakEvenASP,
    min_asp_5pct: minASP5,
    best_case_profit: best.profit,
    best_case_npm: best.npm,
    worst_case_profit: worst.profit,
    worst_case_npm: worst.npm,
    stress_cost_profit: s1.profit,
    stress_cost_npm: s1.npm,
    stress_asp_profit: s2.profit,
    stress_asp_npm: s2.npm,
    stress_delay_profit: s3.profit,
    stress_delay_npm: s3.npm,
    recommendation: rec,
    npm_label: npmLabel(npm),
    land_label: landLabel(landCostRatio),
  }
}
