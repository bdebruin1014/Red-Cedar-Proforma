// ============================================================
// S-Curve Distribution Engine
// Distributes a total cost across months using a logistic curve
// Rates 1-9 control steepness: 1=flat (linear), 9=steep (back-loaded)
// ============================================================

// S-curve rate numeric mapping
const RATE_MAP: Record<string, number> = {
  flat_1: 1,
  moderately_flat_3: 3,
  moderate_5: 5,
  moderately_steep_7: 7,
  steep_9: 9,
}

/**
 * Generate a logistic S-curve distribution for a given number of months.
 * Returns an array of fractions that sum to 1.0.
 *
 * k = steepness parameter derived from rate (1=flat/linear, 9=very steep)
 * Uses logistic function: f(t) = 1 / (1 + e^(-k*(t - midpoint)))
 * Then takes the derivative (bell curve) and normalizes.
 */
export function generateSCurve(durationMonths: number, rate: string | number): number[] {
  if (durationMonths <= 0) return []
  if (durationMonths === 1) return [1.0]

  const k = typeof rate === 'number' ? rate : (RATE_MAP[rate] || 5)

  // For flat (rate=1), use straight line
  if (k <= 1) {
    const equal = 1.0 / durationMonths
    return Array(durationMonths).fill(equal)
  }

  // Steepness factor: map 1-9 to a logistic k parameter
  // Higher k = steeper S-curve = more cost concentrated in middle months
  const steepness = k * 0.4

  const midpoint = (durationMonths - 1) / 2
  const raw: number[] = []

  for (let m = 0; m < durationMonths; m++) {
    // Logistic derivative (bell shape centered at midpoint)
    const x = steepness * (m - midpoint)
    const ex = Math.exp(-x)
    const val = (steepness * ex) / Math.pow(1 + ex, 2)
    raw.push(val)
  }

  // Normalize so fractions sum to 1.0
  const sum = raw.reduce((a, b) => a + b, 0)
  if (sum === 0) return Array(durationMonths).fill(1.0 / durationMonths)

  return raw.map(v => v / sum)
}

/**
 * Distribute a total amount across a timeline using S-curve.
 * Returns monthly amounts starting at startMonth.
 */
export function distributeAmount(
  totalAmount: number,
  startMonth: number,
  durationMonths: number,
  rate: string | number,
  totalProjectMonths: number
): number[] {
  const timeline = Array(totalProjectMonths).fill(0)
  const curve = generateSCurve(durationMonths, rate)

  for (let i = 0; i < curve.length; i++) {
    const monthIdx = startMonth + i
    if (monthIdx < totalProjectMonths) {
      timeline[monthIdx] = totalAmount * curve[i]
    }
  }

  return timeline
}

/**
 * Distribute using straight-line method.
 */
export function distributeStraightLine(
  totalAmount: number,
  startMonth: number,
  durationMonths: number,
  totalProjectMonths: number
): number[] {
  const timeline = Array(totalProjectMonths).fill(0)
  const monthly = totalAmount / durationMonths

  for (let i = 0; i < durationMonths; i++) {
    const monthIdx = startMonth + i
    if (monthIdx < totalProjectMonths) {
      timeline[monthIdx] = monthly
    }
  }

  return timeline
}

/**
 * Distribute a budget line item based on its forecast method.
 */
export function distributeBudgetItem(
  item: {
    total_amount: number
    forecast_method: string
    start_month: number
    duration_months: number
    s_curve_rate: string
    is_included: boolean
  },
  totalProjectMonths: number
): number[] {
  if (!item.is_included || !item.total_amount) {
    return Array(totalProjectMonths).fill(0)
  }

  switch (item.forecast_method) {
    case 's_curve':
      return distributeAmount(
        item.total_amount,
        item.start_month,
        item.duration_months,
        item.s_curve_rate,
        totalProjectMonths
      )
    case 'straight_line':
      return distributeStraightLine(
        item.total_amount,
        item.start_month,
        item.duration_months,
        totalProjectMonths
      )
    case 'manual_input':
      // Manual: lump sum at start month
      const timeline = Array(totalProjectMonths).fill(0)
      if (item.start_month < totalProjectMonths) {
        timeline[item.start_month] = item.total_amount
      }
      return timeline
    default:
      return distributeAmount(
        item.total_amount,
        item.start_month,
        item.duration_months,
        item.s_curve_rate,
        totalProjectMonths
      )
  }
}

/**
 * Aggregate multiple budget item timelines into a single monthly total.
 */
export function aggregateTimelines(timelines: number[][]): number[] {
  if (timelines.length === 0) return []
  const len = Math.max(...timelines.map(t => t.length))
  const result = Array(len).fill(0)

  for (const timeline of timelines) {
    for (let i = 0; i < timeline.length; i++) {
      result[i] += timeline[i]
    }
  }

  return result
}

/**
 * Calculate cumulative totals from a monthly array.
 */
export function cumulativeSum(monthly: number[]): number[] {
  const result: number[] = []
  let running = 0
  for (const val of monthly) {
    running += val
    result.push(running)
  }
  return result
}

export type SCurveRate = 'flat_1' | 'moderately_flat_3' | 'moderate_5' | 'moderately_steep_7' | 'steep_9'
export type ForecastMethod = 's_curve' | 'manual_input' | 'straight_line'
export type BudgetCategory = 'land' | 'horizontal' | 'vertical' | 'soft_cost' | 'closing_financing'

export const SCURVE_LABELS: Record<string, string> = {
  flat_1: 'Flat (1)',
  moderately_flat_3: 'Mod. Flat (3)',
  moderate_5: 'Moderate (5)',
  moderately_steep_7: 'Mod. Steep (7)',
  steep_9: 'Steep (9)',
}

export const FORECAST_LABELS: Record<string, string> = {
  s_curve: 'S-Curve',
  manual_input: 'Manual (Lump)',
  straight_line: 'Straight Line',
}

export const CATEGORY_LABELS: Record<string, string> = {
  land: 'Land Acquisition',
  horizontal: 'Horizontal Development',
  vertical: 'Vertical Construction',
  soft_cost: 'Soft Costs',
  closing_financing: 'Closing & Financing',
}

// Default line items by category for new BTR projects
export const DEFAULT_BUDGET_ITEMS: { category: BudgetCategory; name: string; method: ForecastMethod; rate: SCurveRate; startMonth: number; duration: number }[] = [
  // Land
  { category: 'land', name: 'Purchase Price', method: 'manual_input', rate: 'flat_1', startMonth: 0, duration: 1 },
  { category: 'land', name: 'Closing Costs', method: 'manual_input', rate: 'flat_1', startMonth: 0, duration: 1 },
  { category: 'land', name: 'Entitlement Costs', method: 'manual_input', rate: 'flat_1', startMonth: 0, duration: 1 },

  // Horizontal (if scope includes horizontal)
  { category: 'horizontal', name: 'Grading & Clearing', method: 's_curve', rate: 'moderately_steep_7', startMonth: 1, duration: 4 },
  { category: 'horizontal', name: 'Storm Water', method: 's_curve', rate: 'moderate_5', startMonth: 2, duration: 6 },
  { category: 'horizontal', name: 'Sanitary Sewer', method: 's_curve', rate: 'moderate_5', startMonth: 2, duration: 5 },
  { category: 'horizontal', name: 'Water Lines', method: 's_curve', rate: 'moderate_5', startMonth: 2, duration: 5 },
  { category: 'horizontal', name: 'Roads & Paving', method: 's_curve', rate: 'moderately_steep_7', startMonth: 4, duration: 8 },
  { category: 'horizontal', name: 'Landscape & Irrigation', method: 's_curve', rate: 'steep_9', startMonth: 10, duration: 6 },
  { category: 'horizontal', name: 'Amenity Construction', method: 's_curve', rate: 'moderate_5', startMonth: 6, duration: 10 },

  // Vertical
  { category: 'vertical', name: 'Vertical Hard Costs (S&B)', method: 's_curve', rate: 'moderate_5', startMonth: 3, duration: 18 },
  { category: 'vertical', name: 'Site Specific per Unit', method: 's_curve', rate: 'moderate_5', startMonth: 3, duration: 18 },
  { category: 'vertical', name: 'Upgrades & BTR Specs', method: 's_curve', rate: 'moderate_5', startMonth: 3, duration: 18 },

  // Soft Costs
  { category: 'soft_cost', name: 'Architecture & Engineering', method: 's_curve', rate: 'moderately_flat_3', startMonth: 0, duration: 6 },
  { category: 'soft_cost', name: 'Permits & Impact Fees', method: 's_curve', rate: 'moderately_flat_3', startMonth: 1, duration: 12 },
  { category: 'soft_cost', name: 'Legal & Accounting', method: 'straight_line', rate: 'flat_1', startMonth: 0, duration: 24 },
  { category: 'soft_cost', name: 'Insurance', method: 'straight_line', rate: 'flat_1', startMonth: 0, duration: 24 },
  { category: 'soft_cost', name: 'Property Taxes (Construction)', method: 'straight_line', rate: 'flat_1', startMonth: 0, duration: 24 },
  { category: 'soft_cost', name: 'Marketing & Lease-Up', method: 's_curve', rate: 'steep_9', startMonth: 12, duration: 12 },

  // Closing & Financing
  { category: 'closing_financing', name: 'Loan Origination', method: 'manual_input', rate: 'flat_1', startMonth: 0, duration: 1 },
  { category: 'closing_financing', name: 'Construction Interest Reserve', method: 'straight_line', rate: 'flat_1', startMonth: 0, duration: 24 },
  { category: 'closing_financing', name: 'Operating Reserve', method: 'manual_input', rate: 'flat_1', startMonth: 0, duration: 1 },
]
