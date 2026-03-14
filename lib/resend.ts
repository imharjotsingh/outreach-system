import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM_EMAIL = process.env.FROM_EMAIL || 'outreach@yourdomain.com'
export const FROM_NAME = process.env.FROM_NAME || 'Your Name'
export const INBOUND_DOMAIN = process.env.INBOUND_DOMAIN || 'inbound.resend.dev'

export function buildReplyToAddress(campaignContactId: string): string {
  return `reply+${campaignContactId}@${INBOUND_DOMAIN}`
}

export function parseCampaignContactId(toAddress: string): string | null {
  const match = toAddress.match(/reply\+([^@]+)@/)
  return match ? match[1] : null
}

export function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] || variables[key.toLowerCase()] || `{{${key}}}`
  })
}
