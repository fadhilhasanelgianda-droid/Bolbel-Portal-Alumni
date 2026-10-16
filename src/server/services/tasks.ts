import { z } from 'zod';
import type { FollowUpTask } from '../../domain/types.ts';
import { query } from '../db.ts';
import { HttpError } from '../http.ts';
import { rowTo, rowsTo } from '../mappers.ts';

export const taskInputSchema = z.object({
  processId: z.string().uuid().nullish(),
  jobId: z.string().uuid().nullish(),
  alumniId: z.string().uuid().nullish(),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(2000).default(''),
  taskType: z.enum([
    'review_new_application', 'monitor_consent', 'forward_cv', 'followup_company', 'review_alumni_report', 'closed_job_cleanup',
  ]),
  ownerName: z.string().trim().min(1).max(100),
  dueAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

export const taskStatusSchema = z.object({ completed: z.boolean() });

export async function listTasks(): Promise<FollowUpTask[]> {
  const { rows } = await query(`SELECT * FROM follow_up_tasks ORDER BY status DESC, due_at`);
  return rowsTo<FollowUpTask>(rows);
}

export async function createTask(input: z.infer<typeof taskInputSchema>): Promise<FollowUpTask> {
  const { rows } = await query(
    `INSERT INTO follow_up_tasks (process_id, job_id, alumni_id, title, description, task_type, owner_name, due_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [input.processId ?? null, input.jobId ?? null, input.alumniId ?? null, input.title, input.description,
     input.taskType, input.ownerName, input.dueAt]
  );
  return rowTo<FollowUpTask>(rows[0]);
}

export async function setTaskCompleted(id: string, completed: boolean): Promise<FollowUpTask> {
  const { rows } = await query(
    `UPDATE follow_up_tasks
        SET status = $2, completed_at = CASE WHEN $3 THEN now() END
      WHERE id = $1 RETURNING *`,
    [id, completed ? 'completed' : 'pending', completed]
  );
  if (!rows[0]) throw new HttpError(404, 'Tugas tidak ditemukan.');
  return rowTo<FollowUpTask>(rows[0]);
}
