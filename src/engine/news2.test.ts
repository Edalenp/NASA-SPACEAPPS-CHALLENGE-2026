import { describe, expect, it } from 'vitest'
import { calculateNews2, type News2Input } from './news2'

const normalInput: News2Input = {
  respiratoryRate: 10,
  oxygenSaturation: 97,
  onSupplementalOxygen: false,
  systolicBloodPressure: 120,
  heartRate: 70,
  temperature: 37,
  consciousness: 'alert',
}

describe('calculateNews2 bands (RCP chart)', () => {
  it('scores respiratory rate per band', () => {
    expect(calculateNews2({ ...normalInput, respiratoryRate: 7 }).scores.respiratoryRate).toBe(3)
    expect(calculateNews2({ ...normalInput, respiratoryRate: 10 }).scores.respiratoryRate).toBe(0)
    expect(calculateNews2({ ...normalInput, respiratoryRate: 15 }).scores.respiratoryRate).toBe(1)
    expect(calculateNews2({ ...normalInput, respiratoryRate: 22 }).scores.respiratoryRate).toBe(2)
    expect(calculateNews2({ ...normalInput, respiratoryRate: 26 }).scores.respiratoryRate).toBe(3)
  })

  it('scores oxygen saturation per band and adds oxygen supplement', () => {
    expect(calculateNews2({ ...normalInput, oxygenSaturation: 90 }).scores.oxygenSaturation).toBe(3)
    expect(calculateNews2({ ...normalInput, oxygenSaturation: 92 }).scores.oxygenSaturation).toBe(2)
    expect(calculateNews2({ ...normalInput, oxygenSaturation: 94 }).scores.oxygenSaturation).toBe(1)
    expect(calculateNews2({ ...normalInput, oxygenSaturation: 97 }).scores.oxygenSaturation).toBe(0)
    expect(
      calculateNews2({ ...normalInput, oxygenSaturation: 97, onSupplementalOxygen: true })
        .scores.oxygenSaturation,
    ).toBe(2)
  })

  it('scores systolic blood pressure per band', () => {
    expect(
      calculateNews2({ ...normalInput, systolicBloodPressure: 88 }).scores.systolicBloodPressure,
    ).toBe(3)
    expect(
      calculateNews2({ ...normalInput, systolicBloodPressure: 95 }).scores.systolicBloodPressure,
    ).toBe(2)
    expect(
      calculateNews2({ ...normalInput, systolicBloodPressure: 105 }).scores.systolicBloodPressure,
    ).toBe(1)
    expect(
      calculateNews2({ ...normalInput, systolicBloodPressure: 120 }).scores.systolicBloodPressure,
    ).toBe(0)
    expect(
      calculateNews2({ ...normalInput, systolicBloodPressure: 230 }).scores.systolicBloodPressure,
    ).toBe(3)
  })

  it('scores heart rate per band', () => {
    expect(calculateNews2({ ...normalInput, heartRate: 38 }).scores.heartRate).toBe(3)
    expect(calculateNews2({ ...normalInput, heartRate: 45 }).scores.heartRate).toBe(1)
    expect(calculateNews2({ ...normalInput, heartRate: 70 }).scores.heartRate).toBe(0)
    expect(calculateNews2({ ...normalInput, heartRate: 100 }).scores.heartRate).toBe(1)
    expect(calculateNews2({ ...normalInput, heartRate: 120 }).scores.heartRate).toBe(2)
    expect(calculateNews2({ ...normalInput, heartRate: 140 }).scores.heartRate).toBe(3)
  })

  it('scores temperature per band', () => {
    expect(calculateNews2({ ...normalInput, temperature: 34.5 }).scores.temperature).toBe(3)
    expect(calculateNews2({ ...normalInput, temperature: 35.5 }).scores.temperature).toBe(1)
    expect(calculateNews2({ ...normalInput, temperature: 37 }).scores.temperature).toBe(0)
    expect(calculateNews2({ ...normalInput, temperature: 38.5 }).scores.temperature).toBe(1)
    expect(calculateNews2({ ...normalInput, temperature: 39.5 }).scores.temperature).toBe(2)
  })

  it('scores consciousness ACVPU', () => {
    expect(calculateNews2({ ...normalInput, consciousness: 'alert' }).scores.consciousness).toBe(0)
    expect(
      calculateNews2({ ...normalInput, consciousness: 'newConfusion' }).scores.consciousness,
    ).toBe(3)
  })
})

describe('calculateNews2 classification', () => {
  it('classifies low with no red scores', () => {
    expect(calculateNews2(normalInput).classification).toBe('low')
    expect(calculateNews2(normalInput).total).toBe(0)
  })

  it('classifies singleRed for one red score with total under 5', () => {
    const result = calculateNews2({ ...normalInput, respiratoryRate: 26 })
    expect(result.total).toBe(3)
    expect(result.classification).toBe('singleRed')
  })

  it('classifies medium for total 5 to 6', () => {
    const result = calculateNews2({
      ...normalInput,
      respiratoryRate: 22,
      systolicBloodPressure: 95,
      heartRate: 45,
    })
    expect(result.total).toBe(5)
    expect(result.classification).toBe('medium')
  })

  it('classifies high for total 7 or more', () => {
    const result = calculateNews2({
      ...normalInput,
      respiratoryRate: 26,
      oxygenSaturation: 90,
      systolicBloodPressure: 88,
    })
    expect(result.total).toBe(9)
    expect(result.classification).toBe('high')
  })
})

describe('calculateNews2 incomplete', () => {
  it('returns null classification when a parameter is missing', () => {
    const result = calculateNews2({ ...normalInput, respiratoryRate: null })
    expect(result.isComplete).toBe(false)
    expect(result.classification).toBeNull()
    expect(result.total).toBe(0)
  })

  it('sums available scores when incomplete', () => {
    const result = calculateNews2({ ...normalInput, heartRate: 120, temperature: null })
    expect(result.isComplete).toBe(false)
    expect(result.total).toBe(2)
  })
})
