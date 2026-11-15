import { contactNames } from "../emergency/assessment";
import type { EmergencySession } from "../emergency/workflow";
import { dayKey } from "./adapter";
import type { ReportAction } from "./report";

/** Export confirmations, not planned care. Keep cases, patients and mission days distinct. */
export function emergencyActionsForReport(
  sessions: readonly EmergencySession[],
  crewMemberId: string,
  now: string,
): ReportAction[] {
  const currentDay = (timestamp: string | null): timestamp is string =>
    Boolean(
      timestamp &&
      Number.isFinite(Date.parse(timestamp)) &&
      dayKey(timestamp) === dayKey(now) &&
      Date.parse(timestamp) <= Date.parse(now),
    );
  const actions: ReportAction[] = [];
  for (const session of sessions) {
    if (session.execution.crewMemberId !== crewMemberId) continue;
    const context = {
      caseId: session.execution.id,
      caseTitle: session.execution.title,
      caseStatus: session.execution.status,
    };
    session.visits.forEach((visit, index) => {
      const step = session.execution.steps[index];
      if (
        !step ||
        step.state !== "done" ||
        !visit.answer ||
        !currentDay(visit.answeredAt) ||
        step.completedAt !== visit.answeredAt
      )
        return;
      actions.push({
        ...context,
        timestamp: visit.answeredAt,
        text: `User confirmed: ${step.action.text} | Response: ${visit.answer}`,
        source: `${step.action.sourceTitle} — ${step.action.sourceUrl}`,
      });
    });
    for (const receipt of session.notifications ?? []) {
      const assessment = session.assessments?.find(
        (a) => a.id === receipt.assessmentId,
      );
      if (
        !assessment ||
        assessment.subject.id !== crewMemberId ||
        !assessment.plan?.steps.some(
          (s) => s.contactRole === receipt.contactRole,
        ) ||
        !currentDay(receipt.confirmedAt)
      )
        continue;
      actions.push({
        ...context,
        timestamp: receipt.confirmedAt,
        text: `User recorded notification: ${contactNames[receipt.contactRole]} (not a delivery confirmation)`,
        source: `Mission engine plan · assessment ${assessment.id}`,
      });
    }
  }
  // Stable ordering also retains repeated visits and separate cases at the same instant.
  return actions.sort(
    (a, b) =>
      a.timestamp.localeCompare(b.timestamp) ||
      (a.caseId ?? "").localeCompare(b.caseId ?? ""),
  );
}
