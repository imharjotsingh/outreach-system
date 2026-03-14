import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resend, FROM_EMAIL, FROM_NAME, buildReplyToAddress, renderTemplate } from '@/lib/resend'

const BATCH_SIZE = 100

export async function POST(req: NextRequest) {
  // Verify this is called by QStash or internally
  const secret = req.headers.get('x-process-secret')
  if (process.env.PROCESS_SECRET && secret !== process.env.PROCESS_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Find all active campaign contacts due for their next email
  const due = await prisma.campaignContact.findMany({
    where: {
      status: 'ACTIVE',
      nextSendAt: { lte: now },
    },
    include: {
      contact: true,
      campaign: {
        include: {
          sequence: {
            include: { steps: { orderBy: { stepNumber: 'asc' } } },
          },
        },
      },
    },
    take: BATCH_SIZE,
  })

  if (!due.length) {
    return NextResponse.json({ processed: 0 })
  }

  let processed = 0
  let errors = 0

  for (const cc of due) {
    try {
      const { campaign, contact } = cc
      if (campaign.status !== 'ACTIVE') continue

      const steps = campaign.sequence.steps
      const stepIndex = cc.currentStep - 1

      if (stepIndex < 0 || stepIndex >= steps.length) {
        // Completed all steps
        await prisma.campaignContact.update({
          where: { id: cc.id },
          data: { status: 'COMPLETED', completedAt: now, nextSendAt: null },
        })
        continue
      }

      const step = steps[stepIndex]

      // Build template variables from contact fields
      const customFields = (contact.customFields as Record<string, string>) || {}
      const variables: Record<string, string> = {
        name: contact.name,
        first_name: contact.name.split(' ')[0],
        last_name: contact.name.split(' ').slice(1).join(' '),
        email: contact.email,
        company: contact.company || '',
        ...customFields,
      }

      const subject = renderTemplate(step.subject, variables)
      const html = renderTemplate(step.body, variables)

      const { data, error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: contact.email,
        replyTo: buildReplyToAddress(cc.id),
        subject,
        html,
      })

      if (error) {
        console.error(`Failed to send to ${contact.email}:`, error)
        errors++
        continue
      }

      // Log the sent email
      await prisma.emailLog.create({
        data: {
          campaignContactId: cc.id,
          sequenceStepId: step.id,
          resendEmailId: data?.id,
          status: 'SENT',
        },
      })

      // Schedule next step or mark completed
      const nextStepIndex = cc.currentStep // 0-indexed next = currentStep (1-indexed)
      if (nextStepIndex < steps.length) {
        const nextStep = steps[nextStepIndex]
        const nextSendAt = new Date(now)
        nextSendAt.setDate(nextSendAt.getDate() + nextStep.delayDays)

        await prisma.campaignContact.update({
          where: { id: cc.id },
          data: {
            currentStep: cc.currentStep + 1,
            nextSendAt,
          },
        })
      } else {
        // All steps done
        await prisma.campaignContact.update({
          where: { id: cc.id },
          data: { status: 'COMPLETED', completedAt: now, nextSendAt: null },
        })
      }

      processed++
    } catch (err) {
      console.error('Error processing campaign contact:', err)
      errors++
    }
  }

  return NextResponse.json({ processed, errors, total: due.length })
}

// Allow GET for manual triggering in dev
export async function GET(req: NextRequest) {
  return POST(req)
}
