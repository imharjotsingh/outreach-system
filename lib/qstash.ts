import { Client } from '@upstash/qstash'

export const qstash = new Client({
  token: process.env.QSTASH_TOKEN || '',
})

export async function scheduleQueueProcessor(appUrl: string) {
  // Sets up a cron job to process the email queue every 15 minutes
  await qstash.schedules.create({
    destination: `${appUrl}/api/process-queue`,
    cron: '*/15 * * * *',
  })
}
