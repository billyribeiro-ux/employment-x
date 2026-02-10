import { Queue, Worker, type Job, type WorkerOptions, type QueueOptions } from 'bullmq';
import { z } from 'zod';

import { getRedisConnection } from './connection';

const registeredQueues = new Map<string, Queue>();
const registeredWorkers = new Map<string, Worker>();

export interface QueueDefinition<T> {
  name: string;
  schema: z.ZodType<T>;
  defaultJobOptions?: QueueOptions['defaultJobOptions'];
}

export function createQueue<T>(def: QueueDefinition<T>): Queue<T> {
  if (registeredQueues.has(def.name)) {
    return registeredQueues.get(def.name) as Queue<T>;
  }

  const queue = new Queue<T>(def.name, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
      ...def.defaultJobOptions,
    },
  });

  registeredQueues.set(def.name, queue);
  return queue;
}

export function createWorker<T>(
  queueName: string,
  processor: (job: Job<T>) => Promise<void>,
  opts?: Partial<WorkerOptions>,
): Worker<T> {
  if (registeredWorkers.has(queueName)) {
    return registeredWorkers.get(queueName) as Worker<T>;
  }

  const worker = new Worker<T>(queueName, processor, {
    connection: getRedisConnection(),
    concurrency: 5,
    limiter: { max: 10, duration: 1000 },
    ...opts,
  });

  worker.on('failed', (job, err) => {
    console.error(`[queue:${queueName}] Job ${job?.id} failed:`, err.message);
  });

  worker.on('completed', (job) => {
    console.log(`[queue:${queueName}] Job ${job.id} completed`);
  });

  registeredWorkers.set(queueName, worker);
  return worker;
}

export async function closeAllQueues(): Promise<void> {
  const closeOps: Promise<void>[] = [];
  for (const [, w] of registeredWorkers) closeOps.push(w.close());
  for (const [, q] of registeredQueues) closeOps.push(q.close());
  await Promise.all(closeOps);
  registeredQueues.clear();
  registeredWorkers.clear();
}

export function getQueue<T>(name: string): Queue<T> | undefined {
  return registeredQueues.get(name) as Queue<T> | undefined;
}
