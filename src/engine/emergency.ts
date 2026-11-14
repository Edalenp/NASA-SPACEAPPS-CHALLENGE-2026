import type { SourcedAction } from './types'

export type EmergencyStepState = 'pending' | 'done' | 'skipped'

export interface EmergencyStep {
  action: SourcedAction
  state: EmergencyStepState
  completedAt: string | null
}

export type EmergencyStatus = 'notStarted' | 'inProgress' | 'completed' | 'aborted'

export interface EmergencyProtocol {
  id: string
  crewMemberId: string
  title: string
  steps: EmergencyStep[]
  status: EmergencyStatus
  startedAt: string | null
}

export type EmergencyCommand =
  | { type: 'start'; at: string }
  | { type: 'completeStep'; stepIndex: number; at: string }
  | { type: 'skipStep'; stepIndex: number; at: string }
  | { type: 'abort'; at: string }

export function createProtocol(
  id: string,
  crewMemberId: string,
  title: string,
  actions: SourcedAction[],
): EmergencyProtocol {
  return {
    id,
    crewMemberId,
    title,
    steps: actions.map((action) => ({ action, state: 'pending', completedAt: null })),
    status: 'notStarted',
    startedAt: null,
  }
}

export function advanceProtocol(
  protocol: EmergencyProtocol,
  command: EmergencyCommand,
): EmergencyProtocol {
  if (protocol.status !== 'inProgress' && command.type !== 'start') return protocol
  switch (command.type) {
    case 'start':
      if (protocol.status !== 'notStarted') return protocol
      return { ...protocol, status: 'inProgress', startedAt: command.at }
    case 'completeStep': {
      const step = protocol.steps[command.stepIndex]
      if (step === undefined || step.state !== 'pending') return protocol
      const steps = protocol.steps.map((s, i) =>
        i === command.stepIndex ? { ...s, state: 'done' as const, completedAt: command.at } : s,
      )
      const completed = steps.every((s) => s.state === 'done')
      return { ...protocol, steps, status: completed ? 'completed' : 'inProgress' }
    }
    case 'skipStep': {
      const step = protocol.steps[command.stepIndex]
      if (step === undefined || step.state !== 'pending') return protocol
      const steps = protocol.steps.map((s, i) =>
        i === command.stepIndex ? { ...s, state: 'skipped' as const, completedAt: command.at } : s,
      )
      return { ...protocol, steps }
    }
    case 'abort':
      return { ...protocol, status: 'aborted' }
  }
}
