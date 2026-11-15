import { describe, expect, it } from 'vitest'
import {
  CLINICAL_LIMIT_SOURCES,
  clinicalMessage,
  clinicalSeverity,
} from './clinicalLimits'
import type { GlucoseContext } from './types'

const fastingVenous: GlucoseContext = { timing: 'fasting', specimen: 'venousPlasma' }
const randomCapillary: GlucoseContext = { timing: 'random', specimen: 'capillary' }

describe('clinicalSeverity thresholds', () => {
  it('follows the AHA blood pressure tiers', () => {
    expect(clinicalSeverity('systolicBloodPressure', 181)).toBe('alert')
    expect(clinicalSeverity('systolicBloodPressure', 180)).toBe('watch')
    expect(clinicalSeverity('systolicBloodPressure', 140)).toBe('watch')
    expect(clinicalSeverity('systolicBloodPressure', 139)).toBeNull()
    expect(clinicalSeverity('diastolicBloodPressure', 121)).toBe('alert')
    expect(clinicalSeverity('diastolicBloodPressure', 90)).toBe('watch')
    expect(clinicalSeverity('diastolicBloodPressure', 89)).toBeNull()
  })

  it('flags bradycardia and tachycardia outside the AHA resting range', () => {
    expect(clinicalSeverity('heartRate', 59)).toBe('watch')
    expect(clinicalSeverity('heartRate', 101)).toBe('watch')
    expect(clinicalSeverity('heartRate', 60)).toBeNull()
    expect(clinicalSeverity('heartRate', 100)).toBeNull()
  })

  it('flags breathing outside 12-20 breaths/min', () => {
    expect(clinicalSeverity('respiratoryRate', 11)).toBe('watch')
    expect(clinicalSeverity('respiratoryRate', 21)).toBe('watch')
    expect(clinicalSeverity('respiratoryRate', 12)).toBeNull()
    expect(clinicalSeverity('respiratoryRate', 20)).toBeNull()
  })

  it('alerts on hypoxemia and watches below the BTS oxygen target', () => {
    expect(clinicalSeverity('oxygenSaturation', 89)).toBe('alert')
    expect(clinicalSeverity('oxygenSaturation', 90)).toBe('watch')
    expect(clinicalSeverity('oxygenSaturation', 93)).toBe('watch')
    expect(clinicalSeverity('oxygenSaturation', 94)).toBeNull()
  })

  it('flags fever and red-flag temperature', () => {
    expect(clinicalSeverity('temperature', 38)).toBe('watch')
    expect(clinicalSeverity('temperature', 37.9)).toBeNull()
    expect(clinicalSeverity('temperature', 40.1)).toBe('alert')
  })

  it('follows the ADA glucose bands and gates the screening watch by context', () => {
    expect(clinicalSeverity('glucose', 53)).toBe('alert')
    expect(clinicalSeverity('glucose', 54)).toBe('watch')
    expect(clinicalSeverity('glucose', 69)).toBe('watch')
    expect(clinicalSeverity('glucose', 70)).toBeNull()
    expect(clinicalSeverity('glucose', 125)).toBeNull()
    expect(clinicalSeverity('glucose', 126)).toBeNull()
    expect(clinicalSeverity('glucose', 126, fastingVenous)).toBe('watch')
    expect(clinicalSeverity('glucose', 199, fastingVenous)).toBe('watch')
    expect(clinicalSeverity('glucose', 199, randomCapillary)).toBeNull()
    expect(clinicalSeverity('glucose', 200)).toBe('alert')
    expect(clinicalSeverity('glucose', 200, randomCapillary)).toBe('alert')
    expect(clinicalSeverity('glucose', 201)).toBe('alert')
    expect(clinicalMessage('glucose', 200)).toBe(
      'Glucose 200 mg/dL or higher: clinical review flag, not a diagnosis',
    )
    expect(clinicalMessage('glucose', 130, fastingVenous)).toBe(
      'Fasting venous plasma glucose 126-199 mg/dL: screening watch, confirmation required',
    )
  })

  it('walks every glucose boundary by draw context', () => {
    const severity = (value: number, context?: GlucoseContext) => {
      if (value < 54) return 'alert'
      if (value < 70) return 'watch'
      if (value < 126) return null
      if (value < 200) return context === fastingVenous ? 'watch' : null
      return 'alert'
    }
    for (const value of [53, 54, 69, 70, 125, 126, 199, 200, 201]) {
      for (const context of [undefined, fastingVenous, randomCapillary]) {
        expect(clinicalSeverity('glucose', value, context), `${value}/${context?.timing}`).toBe(
          severity(value, context),
        )
      }
    }
  })

  it('watches sleep below the NHLBI recommendation only', () => {
    expect(clinicalSeverity('sleepHours', 6.9)).toBe('watch')
    expect(clinicalSeverity('sleepHours', 7)).toBeNull()
    expect(clinicalSeverity('sleepHours', 11)).toBeNull()
  })

  it('carries no absolute limits without a citable standard', () => {
    expect(clinicalSeverity('mood', 1)).toBeNull()
    expect(clinicalSeverity('reactionTime', 5000)).toBeNull()
  })
})

describe('clinicalMessage', () => {
  it('names the standard and the threshold', () => {
    expect(clinicalMessage('systolicBloodPressure', 200)).toBe(
      'AHA severe hypertension: above 180 mmHg',
    )
    expect(clinicalMessage('systolicBloodPressure', 150)).toBe(
      'AHA stage 2 hypertension: 140 mmHg or higher',
    )
    expect(clinicalMessage('oxygenSaturation', 85)).toBe(
      'Hypoxemia: SpO2 below 90%',
    )
  })

  it('returns null when nothing is breached', () => {
    expect(clinicalMessage('systolicBloodPressure', 120)).toBeNull()
    expect(clinicalMessage('mood', 1)).toBeNull()
  })
})

describe('CLINICAL_LIMIT_SOURCES', () => {
  it('cites every standard with a URL', () => {
    expect(CLINICAL_LIMIT_SOURCES.length).toBeGreaterThan(0)
    for (const source of CLINICAL_LIMIT_SOURCES) {
      expect(source.label.length).toBeGreaterThan(0)
      expect(source.url.startsWith('https://')).toBe(true)
    }
  })
})
