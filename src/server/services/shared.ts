import type pg from 'pg';
import type { EventType, ProcessOutcome, SelectionStage, UserRole, EventSourceType, FollowUpTaskType } from '../../domain/types.ts';

export type Db = pg.Pool | pg.PoolClient;

export const POLICY_VERSION = 'v1.0-2026';

export const addDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

export interface NewEvent {
  processId: string;
  eventType: EventType;
  previousStage?: SelectionStage;
  newStage?: SelectionStage;
  previousOutcome?: ProcessOutcome;
  newOutcome?: ProcessOutcome;
  actor: { id: string; fullName: string; role: UserRole };
  sourceType: EventSourceType;
  occurredAt?: string | Date;
  publicMessage?: string;
  internalNotes?: string;
}

export async function insertEvent(db: Db, e: NewEvent): Promise<void> {
  await db.query(
    `INSERT INTO process_events
       (process_id, event_type, previous_stage, new_stage, previous_outcome, new_outcome,
        actor_id, actor_name, actor_role, source_type, occurred_at, public_message, internal_notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, COALESCE($11::timestamptz, now()), $12, $13)`,
    [
      e.processId,
      e.eventType,
      e.previousStage ?? null,
      e.newStage ?? null,
      e.previousOutcome ?? null,
      e.newOutcome ?? null,
      e.actor.id,
      e.actor.fullName,
      e.actor.role,
      e.sourceType,
      e.occurredAt ?? null,
      e.publicMessage ?? null,
      e.internalNotes ?? null,
    ]
  );
}

export interface NewTask {
  processId?: string;
  jobId?: string;
  alumniId?: string;
  title: string;
  description: string;
  taskType: FollowUpTaskType;
  ownerName: string;
  dueAt: Date;
}

export async function insertTask(db: Db, t: NewTask): Promise<void> {
  await db.query(
    `INSERT INTO follow_up_tasks (process_id, job_id, alumni_id, title, description, task_type, owner_name, due_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [t.processId ?? null, t.jobId ?? null, t.alumniId ?? null, t.title, t.description, t.taskType, t.ownerName, t.dueAt]
  );
}
