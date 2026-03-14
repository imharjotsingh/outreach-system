import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, data } = body

  const resendEmailId = data?.email_id

  if (!resendEmailId) return NextResponse.json({ ok: true })

  const log = await prisma.emailLog.findUnique({ where: { resendEmailId } })
  if (!log) return NextResponse.json({ ok: true })

  const now = new Date()

  switch (type) {
    case 'email.delivered':
      await prisma.emailLog.update({
        where: { resendEmailId },
        data: { status: 'DELIVERED' },
      })
      break

    case 'email.opened':
      await prisma.emailLog.update({
        where: { resendEmailId },
        data: { status: 'OPENED', openedAt: now },
      })
      break

    case 'email.clicked':
      await prisma.emailLog.update({
        where: { resendEmailId },
        data: { status: 'CLICKED', clickedAt: now },
      })
      break

    case 'email.bounced':
      await prisma.emailLog.update({
        where: { resendEmailId },
        data: { status: 'BOUNCED', bouncedAt: now },
      })
      // Stop sequence for bounced contacts
      await prisma.campaignContact.update({
        where: { id: log.campaignContactId },
        data: { status: 'BOUNCED', nextSendAt: null },
      })
      break

    case 'email.complained':
      await prisma.campaignContact.update({
        where: { id: log.campaignContactId },
        data: { status: 'UNSUBSCRIBED', nextSendAt: null },
      })
      break
  }

  return NextResponse.json({ ok: true })
}
