import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const sequences = await prisma.sequence.findMany({
    include: {
      steps: { orderBy: { stepNumber: 'asc' } },
      _count: { select: { campaigns: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(sequences)
}

export async function POST(req: NextRequest) {
  const { name, steps } = await req.json()

  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const sequence = await prisma.sequence.create({
    data: {
      name,
      steps: steps?.length
        ? {
            create: steps.map((s: { subject: string; body: string; delayDays: number }, i: number) => ({
              stepNumber: i + 1,
              subject: s.subject,
              body: s.body,
              delayDays: s.delayDays || 0,
            })),
          }
        : undefined,
    },
    include: { steps: { orderBy: { stepNumber: 'asc' } } },
  })

  return NextResponse.json(sequence)
}
