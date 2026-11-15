export interface DoseLimits {
  careerMsv: number
  solarEventMsv: number
}

export const DOSE_LIMITS_MSV: DoseLimits = {
  careerMsv: 600,
  solarEventMsv: 250,
}

export const DOSE_SOURCES = [
  {
    sourceTitle: 'NASA-STD-3001 Vol. 1 Rev. C (OCHMO) — Space Permissible Exposure Limits',
    sourceUrl: 'https://standards.nasa.gov/standard/NASA/NASA-STD-3001_VOL_1',
  },
  {
    sourceTitle: 'CSA — How does radiation affect the human body in space?',
    sourceUrl: 'https://www.asc-csa.gc.ca/eng/astronauts/space-medicine/radiation.asp',
  },
]

export interface DoseStatus {
  careerExceeded: boolean
  solarEventExceeded: boolean
}

export function aggregateDose(dailyDosesMsv: readonly number[]): number {
  return dailyDosesMsv.reduce((sum, dose) => sum + dose, 0)
}

/**
 * Compares two separate accumulations against NASA-STD-3001 limits (RF-32).
 * `careerMsv` is total dose across the whole career; `solarEventMsv` is the
 * dose received within a single solar particle event. The 250 mSv limit
 * applies per event, never to the career total.
 */
export function doseStatus(
  careerMsv: number,
  solarEventMsv: number,
  limits: DoseLimits = DOSE_LIMITS_MSV,
): DoseStatus {
  return {
    careerExceeded: careerMsv >= limits.careerMsv,
    solarEventExceeded: solarEventMsv >= limits.solarEventMsv,
  }
}
