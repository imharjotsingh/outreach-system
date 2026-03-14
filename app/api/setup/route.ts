import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@upstash/qstash'

// Call this once after deployment to set up the QStash cron
// POST /api/setup with { secret: process.env.PROCESS_SECRET }
export async function POST(req: NextRequest) {
  const { secret } = await req.json()
  if (secret !== process.env.PROCESS_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const appUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.APP_URL || 'http://localhost:3000'

  const qstash = new Client({ token: process.env.QSTASH_TOKEN || '' })

  // List existing schedules to avoid duplicates
  const existing = await qstash.schedules.list()
  const alreadyExists = existing.some((s) =>
    s.destination?.includes('/api/process-queue')
  )

  if (alreadyExists) {
    return NextResponse.json({ message: 'Cron already registered' })
  }

  const schedule = await qstash.schedules.create({
    destination: `${appUrl}/api/process-queue`,
    cron: '*/15 * * * *',
    headers: {
      'x-process-secret': process.env.PROCESS_SECRET || '',
    },
  })

  return NextResponse.json({ success: true, scheduleId: schedule.scheduleId })
}
