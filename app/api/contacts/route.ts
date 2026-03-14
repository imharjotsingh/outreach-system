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
  let body: { contacts?: unknown[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { contacts } = body

  if (!contacts || !Array.isArray(contacts)) {
    return NextResponse.json({ error: 'Invalid payload: send { contacts: [...] }' }, { status: 400 })
  }

  type ContactInput = { name?: string; email?: string; company?: string; customFields?: Record<string, string> }
  const normalized = (contacts as ContactInput[]).map((c) => ({
    email: typeof c.email === 'string' ? c.email.trim().toLowerCase() : '',
    name: typeof c.name === 'string' ? c.name.trim() || 'Contact' : 'Contact',
    company: typeof c.company === 'string' ? c.company.trim() || undefined : undefined,
    customFields: c.customFields && typeof c.customFields === 'object' ? c.customFields : {},
  })).filter((c) => c.email.length > 0)

  if (normalized.length === 0) {
    return NextResponse.json({ error: 'No valid contacts (need at least one with email)' }, { status: 400 })
  }

  try {
    const results = await Promise.allSettled(
      normalized.map((c) =>
        prisma.contact.upsert({
          where: { email: c.email },
          update: {
            name: c.name,
            company: c.company,
            customFields: c.customFields,
          },
          create: {
            email: c.email,
            name: c.name,
            company: c.company,
            customFields: c.customFields,
          },
        })
      )
    )

    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return NextResponse.json({ imported: succeeded, failed })
  } catch (e) {
    console.error('Contacts import error:', e)
    return NextResponse.json({ error: 'Database error while importing contacts' }, { status: 500 })
  }
}
