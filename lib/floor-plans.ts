export interface FloorPlan {
  name: string
  sf: number
  bed: number
  bath: number
  garage: string
  stories: number
  width: string
  s_and_b: number
  type: 'SFH' | 'TH'
}

// DM Budget September 2025 — Sticks & Bricks only
export const FLOOR_PLANS: FloorPlan[] = [
  // Single Family Homes
  { name: 'MAGNOLIA', sf: 2705, bed: 5, bath: 3, garage: '2-Car', stories: 2, width: "38'", s_and_b: 173255, type: 'SFH' },
  { name: 'CHERRY', sf: 2214, bed: 4, bath: 3, garage: '2-Car', stories: 2, width: "38'", s_and_b: 156913, type: 'SFH' },
  { name: 'RED OAK', sf: 2217, bed: 4, bath: 3, garage: '2-Car', stories: 2, width: "38'", s_and_b: 157800, type: 'SFH' },
  { name: 'ASPEN', sf: 2597, bed: 5, bath: 3, garage: '2-Car', stories: 2, width: "40'", s_and_b: 170100, type: 'SFH' },
  { name: 'WILLOW', sf: 1916, bed: 4, bath: 3, garage: '2-Car', stories: 2, width: "38'", s_and_b: 143200, type: 'SFH' },
  { name: 'BIRCH', sf: 1671, bed: 3, bath: 2, garage: '2-Car', stories: 1, width: "52'", s_and_b: 131800, type: 'SFH' },
  { name: 'JUNIPER', sf: 1454, bed: 3, bath: 2, garage: '2-Car', stories: 1, width: "46'", s_and_b: 120500, type: 'SFH' },
  { name: 'SPRUCE', sf: 1265, bed: 3, bath: 2, garage: '2-Car', stories: 1, width: "42'", s_and_b: 107200, type: 'SFH' },
  { name: 'SYCAMORE', sf: 2033, bed: 4, bath: 3, garage: '2-Car', stories: 2, width: "34'", s_and_b: 148700, type: 'SFH' },
  { name: 'POPLAR', sf: 2471, bed: 5, bath: 3, garage: '2-Car', stories: 2, width: "40'", s_and_b: 164300, type: 'SFH' },
  { name: 'CYPRESS', sf: 2837, bed: 5, bath: 4, garage: '2-Car', stories: 2, width: "44'", s_and_b: 181400, type: 'SFH' },
  { name: 'BANYAN', sf: 2965, bed: 5, bath: 4, garage: '2-Car', stories: 3, width: "30'", s_and_b: 284600, type: 'SFH' },
  { name: 'PINYON', sf: 3118, bed: 5, bath: 4, garage: '3-Car', stories: 2, width: "52'", s_and_b: 198500, type: 'SFH' },
  { name: 'HAZEL', sf: 1546, bed: 3, bath: 2, garage: '2-Car', stories: 1, width: "48'", s_and_b: 125600, type: 'SFH' },
  { name: 'OLIVE', sf: 1800, bed: 3, bath: 2, garage: '2-Car', stories: 1, width: "54'", s_and_b: 138900, type: 'SFH' },
  { name: 'ELM', sf: 2102, bed: 4, bath: 3, garage: '2-Car', stories: 2, width: "36'", s_and_b: 152100, type: 'SFH' },

  // Townhomes
  { name: 'CEDAR TH', sf: 1523, bed: 3, bath: 3, garage: '1-Car', stories: 2, width: "22'", s_and_b: 119400, type: 'TH' },
  { name: 'MAPLE TH', sf: 1298, bed: 2, bath: 3, garage: '1-Car', stories: 2, width: "20'", s_and_b: 108700, type: 'TH' },
  { name: 'ASH TH', sf: 1680, bed: 3, bath: 3, garage: '1-Car', stories: 2, width: "24'", s_and_b: 130200, type: 'TH' },
  { name: 'OAK TH', sf: 1856, bed: 4, bath: 3, garage: '1-Car', stories: 3, width: "22'", s_and_b: 142800, type: 'TH' },
]

export function findPlan(name: string): FloorPlan | undefined {
  return FLOOR_PLANS.find(p => p.name.toLowerCase() === name.toLowerCase())
}

export function filterPlans(opts: {
  minSF?: number
  maxSF?: number
  minBed?: number
  maxWidth?: number
  type?: 'SFH' | 'TH'
}): FloorPlan[] {
  return FLOOR_PLANS.filter(p => {
    if (opts.type && p.type !== opts.type) return false
    if (opts.minSF && p.sf < opts.minSF) return false
    if (opts.maxSF && p.sf > opts.maxSF) return false
    if (opts.minBed && p.bed < opts.minBed) return false
    if (opts.maxWidth) {
      const w = parseInt(p.width)
      if (w > opts.maxWidth) return false
    }
    return true
  })
}
