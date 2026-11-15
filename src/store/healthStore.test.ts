import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { clearAll } from './db'
import { useHealthStore } from './healthStore'
import { useMission } from './mission'

beforeEach(async () => {
  await clearAll()
  useMission.setState({ busy: false })
  await useMission.getState().hydrate()
})

describe('health store integration', () => {
  it('turns a recorded reading into the twin assessment', async () => {
    expect(useHealthStore.getState().assessment.states.heart).toBe('missing')

    await useMission.getState().record('pulse', 150)

    const assessment = useHealthStore.getState().assessment
    expect(assessment.states.heart).toBe('alert')
    expect(assessment.deviations.pulse.status).toBe('alert')
    expect(assessment.score.complete).toBe(false)
    expect(assessment.score.measured).toBe(1)
  })

  it('becomes complete after every NEWS2 observation, including oxygen', async () => {
    const record = useMission.getState().record
    await record('pulse', 70)
    await record('respiration', 16)
    await record('spo2', 98)
    await record('systolic', 120)
    await record('temperature', 37)
    await record('consciousness', 'alert')
    expect(useHealthStore.getState().assessment.score.complete).toBe(false)

    await record('oxygen', 'air')

    const assessment = useHealthStore.getState().assessment
    expect(assessment.score.complete).toBe(true)
    expect(assessment.score.total).toBe(0)
    expect(assessment.score.risk).toBe('Low')
  })

  it('recomputes the Earth reply, not onboard times, when the environment changes', async () => {
    const record = useMission.getState().record
    await record('pulse', 140)
    await record('respiration', 30)
    await record('spo2', 92)
    await record('systolic', 85)
    await record('temperature', 37)
    await record('oxygen', 'air')
    await record('consciousness', 'alert')

    const transit = useHealthStore.getState().assessment.plan
    expect(useHealthStore.getState().assessment.score.classification).toBe(
      'high',
    )
    expect(transit.steps).toHaveLength(2)

    useMission.getState().setEnvironment('base')

    const base = useHealthStore.getState().assessment.plan
    expect(base.steps).toHaveLength(2)
    // RF-24: the onboard officer keeps the same time; only the Earth reply moves.
    expect(base.steps[0].dueAt).toBe(transit.steps[0].dueAt)
    expect(Date.parse(base.steps[1].earliestReplyAt!)).toBeGreaterThan(
      Date.parse(transit.steps[1].earliestReplyAt!),
    )
  })
})
