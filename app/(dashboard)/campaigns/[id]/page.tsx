'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Play, Pause, Users, Upload, CheckCircle, MessageSquare, Ban, Mail } from 'lucide-react'

interface CampaignContact {
  id: string
  status: string
  currentStep: number
  nextSendAt: string | null
  repliedAt: string | null
  contact: { name: string; email: string; company: string | null }
  emailLogs: { id: string; status: string; sentAt: string }[]
}

interface Campaign {
  id: string
  name: string
  status: string
  sequence: { name: string; steps: { id: string; stepNumber: number; subject: string }[] }
  campaignContacts: CampaignContact[]
}

interface Contact {
  id: string
  name: string
  email: string
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'text-blue-600 bg-blue-50',
  REPLIED: 'text-green-700 bg-green-50',
  COMPLETED: 'text-gray-600 bg-gray-100',
  BOUNCED: 'text-red-600 bg-red-50',
  UNSUBSCRIBED: 'text-orange-600 bg-orange-50',
  PENDING: 'text-gray-400 bg-gray-50',
}

const STATUS_ICON: Record<string, React.ElementType> = {
  ACTIVE: Mail,
  REPLIED: MessageSquare,
  COMPLETED: CheckCircle,
  BOUNCED: Ban,
  UNSUBSCRIBED: Ban,
  PENDING: Users,
}

export default function CampaignDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [showAddContacts, setShowAddContacts] = useState(false)
  const [adding, setAdding] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')

  function load() {
    fetch(`/api/campaigns/${id}`)
      .then((r) => r.json())
      .then(setCampaign)
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line

  async function loadContacts() {
    const res = await fetch('/api/contacts?limit=1000')
    const data = await res.json()
    setAllContacts(data.contacts)
    setShowAddContacts(true)
  }

  async function addContacts() {
    if (!selectedContacts.size) return
    setAdding(true)
    await fetch(`/api/campaigns/${id}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactIds: Array.from(selectedContacts) }),
    })
    setAdding(false)
    setShowAddContacts(false)
    setSelectedContacts(new Set())
    load()
  }

  async function launch() {
    if (!confirm('Launch this campaign? All contacts will start receiving emails.')) return
    setLaunching(true)
    await fetch(`/api/campaigns/${id}/launch`, { method: 'POST' })
    setLaunching(false)
    load()
  }

  async function togglePause() {
    const newStatus = campaign?.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    load()
  }

  if (!campaign) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-100 rounded w-64" /><div className="h-64 bg-gray-100 rounded" /></div>
  }

  const contacts = campaign.campaignContacts
  const statuses = contacts.reduce((acc, cc) => {
    acc[cc.status] = (acc[cc.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const filtered = statusFilter === 'ALL' ? contacts : contacts.filter((c) => c.status === statusFilter)

  const existingContactIds = new Set(contacts.map((cc) => cc.contact.email))
  const availableContacts = allContacts.filter((c) => !existingContactIds.has(c.email))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.push('/campaigns')} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 flex-1">{campaign.name}</h2>
        <div className="flex items-center gap-2">
          {campaign.status === 'DRAFT' && (
            <button
              onClick={() => loadContacts()}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              <Upload className="h-4 w-4" />
              Add Contacts
            </button>
          )}
          {campaign.status === 'DRAFT' && contacts.length > 0 && (
            <button
              onClick={launch}
              disabled={launching}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {launching ? 'Launching…' : 'Launch Campaign'}
            </button>
          )}
          {campaign.status === 'ACTIVE' && (
            <button
              onClick={togglePause}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600"
            >
              <Pause className="h-4 w-4" />
              Pause
            </button>
          )}
          {campaign.status === 'PAUSED' && (
            <button
              onClick={togglePause}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              <Play className="h-4 w-4" />
              Resume
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-500 ml-10 mb-6">
        Sequence: {campaign.sequence.name} · {campaign.sequence.steps.length} steps ·{' '}
        <span className={`font-medium ${campaign.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-500'}`}>
          {campaign.status}
        </span>
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total', value: contacts.length, color: 'text-gray-900' },
          { label: 'Active', value: statuses.ACTIVE || 0, color: 'text-blue-600' },
          { label: 'Replied', value: statuses.REPLIED || 0, color: 'text-green-600' },
          { label: 'Completed', value: statuses.COMPLETED || 0, color: 'text-gray-500' },
          { label: 'Bounced', value: statuses.BOUNCED || 0, color: 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Add contacts panel */}
      {showAddContacts && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">
              Add contacts ({availableContacts.length} available)
            </h3>
            <button
              onClick={() => {
                if (selectedContacts.size === availableContacts.length) {
                  setSelectedContacts(new Set())
                } else {
                  setSelectedContacts(new Set(availableContacts.map((c) => c.id)))
                }
              }}
              className="text-xs text-blue-600 hover:underline"
            >
              {selectedContacts.size === availableContacts.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg mb-3">
            {availableContacts.map((c) => (
              <label key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedContacts.has(c.id)}
                  onChange={(e) =>
                    setSelectedContacts((prev) => {
                      const next = new Set(prev)
                      e.target.checked ? next.add(c.id) : next.delete(c.id)
                      return next
                    })
                  }
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{c.name}</div>
                  <div className="text-xs text-gray-500 truncate">{c.email}</div>
                </div>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={addContacts}
              disabled={adding || !selectedContacts.size}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {adding ? 'Adding…' : `Add ${selectedContacts.size} contacts`}
            </button>
            <button
              onClick={() => setShowAddContacts(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Contacts table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50 flex-wrap">
          <span className="text-sm font-medium text-gray-700 mr-2">Filter:</span>
          {['ALL', 'ACTIVE', 'REPLIED', 'COMPLETED', 'BOUNCED', 'PENDING'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s} {s !== 'ALL' && statuses[s] ? `(${statuses[s]})` : ''}
            </button>
          ))}
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Step</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Next send</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Emails</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  {contacts.length === 0
                    ? 'No contacts added yet'
                    : 'No contacts match this filter'}
                </td>
              </tr>
            ) : (
              filtered.map((cc) => {
                const Icon = STATUS_ICON[cc.status] || Mail
                return (
                  <tr key={cc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{cc.contact.name}</div>
                      <div className="text-xs text-gray-400">{cc.contact.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[cc.status] || ''}`}>
                        <Icon className="h-3 w-3" />
                        {cc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {cc.status === 'ACTIVE' ? `${cc.currentStep} / ${campaign.sequence.steps.length}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {cc.nextSendAt ? new Date(cc.nextSendAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{cc.emailLogs.length}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
