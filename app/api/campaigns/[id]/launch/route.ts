import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { sequence: { include: { steps: { orderBy: { stepNumber: 'asc' } } } } },
  })

  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (campaign.status === 'ACTIVE') return NextResponse.json({ error: 'Already active' }, { status: 400 })
  if (!campaign.sequence.steps.length) {
    return NextResponse.json({ error: 'Sequence has no steps' }, { status: 400 })
  }

  const now = new Date()

  await prisma.campaignContact.updateMany({
    where: { campaignId: id, status: 'PENDING' },
    data: { status: 'ACTIVE', currentStep: 1, nextSendAt: now, startedAt: now },
  })

  await prisma.campaign.update({ where: { id }, data: { status: 'ACTIVE' } })

  return NextResponse.json({ launched: true })
}
