import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { contactIds } = await req.json()

  if (!contactIds?.length) {
    return NextResponse.json({ error: 'contactIds required' }, { status: 400 })
  }

  const campaign = await prisma.campaign.findUnique({ where: { id } })
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  await prisma.campaignContact.createMany({
    data: contactIds.map((contactId: string) => ({ campaignId: id, contactId })),
    skipDuplicates: true,
  })

  const count = await prisma.campaignContact.count({ where: { campaignId: id } })
  return NextResponse.json({ total: count })
}
