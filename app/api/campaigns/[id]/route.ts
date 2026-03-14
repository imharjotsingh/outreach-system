import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      sequence: { include: { steps: { orderBy: { stepNumber: 'asc' } } } },
      campaignContacts: {
        include: {
          contact: true,
          emailLogs: { orderBy: { sentAt: 'desc' } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(campaign)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status } = await req.json()
  const campaign = await prisma.campaign.update({ where: { id }, data: { status } })
  return NextResponse.json(campaign)
}
