import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const [totalContacts, totalSequences, totalCampaigns, emailStats, contactStatuses] = await Promise.all([
    prisma.contact.count(),
    prisma.sequence.count(),
    prisma.campaign.count(),
    prisma.emailLog.groupBy({ by: ['status'], _count: true }),
    prisma.campaignContact.groupBy({ by: ['status'], _count: true }),
  ])

  const emailsByStatus = emailStats.reduce(
    (acc, s) => ({ ...acc, [s.status]: s._count }),
    {} as Record<string, number>
  )

  const contactsByStatus = contactStatuses.reduce(
    (acc, s) => ({ ...acc, [s.status]: s._count }),
    {} as Record<string, number>
  )

  return NextResponse.json({
    totalContacts,
    totalSequences,
    totalCampaigns,
    emailsSent: emailsByStatus.SENT || 0,
    emailsDelivered: emailsByStatus.DELIVERED || 0,
    emailsOpened: emailsByStatus.OPENED || 0,
    emailsClicked: emailsByStatus.CLICKED || 0,
    emailsBounced: emailsByStatus.BOUNCED || 0,
    contactsReplied: contactsByStatus.REPLIED || 0,
    contactsActive: contactsByStatus.ACTIVE || 0,
    contactsCompleted: contactsByStatus.COMPLETED || 0,
  })
}
