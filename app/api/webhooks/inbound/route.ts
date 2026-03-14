import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parseCampaignContactId } from '@/lib/resend'

// Called by Resend when a reply is received at reply+{id}@inbound.domain
export async function POST(req: NextRequest) {
  const body = await req.json()

  // Resend inbound email payload
  const toAddresses: string[] = Array.isArray(body.to) ? body.to : [body.to]

  let campaignContactId: string | null = null
  for (const addr of toAddresses) {
    campaignContactId = parseCampaignContactId(addr)
    if (campaignContactId) break
  }

  if (!campaignContactId) {
    return NextResponse.json({ ok: true })
  }

  const campaignContact = await prisma.campaignContact.findUnique({
    where: { id: campaignContactId },
  })

  if (!campaignContact || campaignContact.status === 'REPLIED') {
    return NextResponse.json({ ok: true })
  }

  // Stop the sequence — mark as replied
  await prisma.campaignContact.update({
    where: { id: campaignContactId },
    data: {
      status: 'REPLIED',
      repliedAt: new Date(),
      nextSendAt: null,
    },
  })

  return NextResponse.json({ ok: true, stopped: campaignContactId })
}
