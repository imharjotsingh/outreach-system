import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const sequences = await prisma.sequence.findMany({
      include: {
        steps: { orderBy: { stepNumber: 'asc' } },
        _count: { select: { campaigns: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(sequences)
  } catch (e) {
    console.error('Sequences GET error:', e)
    return NextResponse.json({ error: 'Failed to load sequences' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  let body: { name?: string; steps?: { subject: string; body: string; delayDays?: number }[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { name, steps } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  }

  try {
    const sequence = await prisma.sequence.create({
      data: {
        name: name.trim(),
        steps: steps?.length
          ? {
              create: steps.map((s: { subject: string; body: string; delayDays?: number }, i: number) => ({
                stepNumber: i + 1,
                subject: typeof s.subject === 'string' ? s.subject : '',
                body: typeof s.body === 'string' ? s.body : '',
                delayDays: typeof s.delayDays === 'number' ? s.delayDays : 0,
              })),
            }
          : undefined,
      },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    })

    return NextResponse.json(sequence)
  } catch (e) {
    console.error('Sequence create error:', e)
    return NextResponse.json({ error: 'Failed to create sequence' }, { status: 500 })
  }
}
