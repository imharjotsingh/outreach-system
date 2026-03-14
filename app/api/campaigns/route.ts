import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    include: {
      sequence: { include: { steps: true } },
      _count: { select: { campaignContacts: true } },
      campaignContacts: {
        select: { status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const enriched = campaigns.map((c) => {
    const statuses = c.campaignContacts.reduce(
      (acc, cc) => {
        acc[cc.status] = (acc[cc.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
    return { ...c, statuses }
  })

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const { name, sequenceId } = await req.json()

  if (!name || !sequenceId) {
    return NextResponse.json({ error: 'name and sequenceId required' }, { status: 400 })
  }

  const campaign = await prisma.campaign.create({
    data: { name, sequenceId },
    include: { sequence: { include: { steps: true } } },
  })

  return NextResponse.json(campaign)
}
