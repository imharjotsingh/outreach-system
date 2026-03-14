import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sequence = await prisma.sequence.findUnique({
    where: { id },
    include: { steps: { orderBy: { stepNumber: 'asc' } } },
  })
  if (!sequence) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(sequence)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name, steps } = await req.json()

  await prisma.sequence.update({ where: { id }, data: { name } })

  if (steps) {
    await prisma.sequenceStep.deleteMany({ where: { sequenceId: id } })
    await prisma.sequenceStep.createMany({
      data: steps.map((s: { subject: string; body: string; delayDays: number }, i: number) => ({
        sequenceId: id,
        stepNumber: i + 1,
        subject: s.subject,
        body: s.body,
        delayDays: s.delayDays || 0,
      })),
    })
  }

  const updated = await prisma.sequence.findUnique({
    where: { id },
    include: { steps: { orderBy: { stepNumber: 'asc' } } },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.sequence.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
