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
  let body: { name?: string; sequenceId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { name, sequenceId } = body

  if (!name || typeof name !== 'string' || !name.trim() || !sequenceId || typeof sequenceId !== 'string') {
    return NextResponse.json({ error: 'name and sequenceId required' }, { status: 400 })
  }

  try {
    const campaign = await prisma.campaign.create({
      data: { name: name.trim(), sequenceId },
      include: { sequence: { include: { steps: true } } },
    })

    return NextResponse.json(campaign)
  } catch (e) {
    console.error('Campaign create error:', e)
    return NextResponse.json({ error: 'Failed to create campaign. Check that the sequence exists.' }, { status: 500 })
  }
}
