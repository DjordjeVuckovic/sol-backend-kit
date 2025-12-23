import { Queue, type QueueOptions } from 'bullmq';
import { env } from '../config/env.js';

const connection = {
  host: new URL(env.REDIS_URL || 'redis://localhost:6379').hostname,
  port: parseInt(new URL(env.REDIS_URL || 'redis://localhost:6379').port || '6379'),
};

const queueOptions: QueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      count: 100,
      age: 3600,
    },
    removeOnFail: {
      count: 1000,
    },
  },
};

export const monitorQueue = new Queue('monitor-transactions', queueOptions);

export async function setupMonitorJob() {
  const jobSchedulers = await monitorQueue.getJobSchedulers();
  for (const scheduler of jobSchedulers) {
    await monitorQueue.removeJobScheduler(scheduler.key);
  }

  await monitorQueue.add(
    'check-transactions',
    {},
    {
      repeat: {
        every: 10000, // 10 seconds
      },
    }
  );

  console.log('Monitor job scheduled to run every 10 seconds');
}

export async function closeQueue() {
  await monitorQueue.close();
  console.log('Monitor queue closed');
}
