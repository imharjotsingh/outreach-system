import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const search = searchParams.get('search') || ''

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { company: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.contact.count({ where }),
  ])

  return NextResponse.json({ contacts, total, page, limit })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { contacts } = body as {
    contacts: { name: string; email: string; company?: string; customFields?: Record<string, string> }[]
  }

  if (!contacts || !Array.isArray(contacts)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Upsert contacts (update if email exists)
  const results = await Promise.allSettled(
    contacts.map((c) =>
      prisma.contact.upsert({
        where: { email: c.email },
        update: {
          name: c.name,
          company: c.company,
          customFields: c.customFields || {},
        },
        create: {
          email: c.email,
          name: c.name,
          company: c.company,
          customFields: c.customFields || {},
        },
      })
    )
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return NextResponse.json({ imported: succeeded, failed })
}
