'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Megaphone, Play, Pause } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  status: string
  createdAt: string
  sequence: { name: string; steps: { id: string }[] }
  _count: { campaignContacts: number }
  statuses: Record<string, number>
}

interface Sequence {
  id: string
  name: string
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSeqId, setNewSeqId] = useState('')

  function load() {
    Promise.all([
      fetch('/api/campaigns').then((r) => r.json()),
      fetch('/api/sequences').then((r) => r.json()),
    ]).then(([camps, seqs]) => {
      setCampaigns(camps)
      setSequences(seqs)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function create() {
    if (!newName.trim() || !newSeqId) return
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), sequenceId: newSeqId }),
    })
    const camp = await res.json()
    setNewName('')
    setNewSeqId('')
    setCreating(false)
    window.location.href = `/campaigns/${camp.id}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Campaigns</h2>
          <p className="text-sm text-gray-500 mt-1">Apply sequences to your contacts</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </button>
      </div>

      {creating && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">New Campaign</h3>
          <div className="space-y-3">
            <input
              autoFocus
              type="text"
              placeholder="Campaign name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newSeqId}
              onChange={(e) => setNewSeqId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a sequence…</option>
              {sequences.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={create}
                disabled={!newName.trim() || !newSeqId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
              <button
                onClick={() => setCreating(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Megaphone className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No campaigns yet. Create one to start reaching out.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const total = c._count.campaignContacts
            const replied = c.statuses.REPLIED || 0
            const active = c.statuses.ACTIVE || 0
            const completed = c.statuses.COMPLETED || 0
            return (
              <Link
                key={c.id}
                href={`/campaigns/${c.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-gray-900">{c.name}</div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      Sequence: {c.sequence.name} · {c.sequence.steps.length} steps
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[c.status]}`}>
                    {c.status}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-500">{total.toLocaleString()} contacts</span>
                  <span className="text-blue-600">{active} active</span>
                  <span className="text-green-600">{replied} replied</span>
                  <span className="text-gray-400">{completed} completed</span>
                  {total > 0 && (
                    <span className="text-gray-400 ml-auto text-xs">
                      {((replied / total) * 100).toFixed(1)}% reply rate
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
