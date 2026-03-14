'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, GitBranch, Trash2, Clock } from 'lucide-react'

interface Sequence {
  id: string
  name: string
  createdAt: string
  steps: { id: string; stepNumber: number; subject: string; delayDays: number }[]
  _count: { campaigns: number }
}

export default function SequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  function load() {
    fetch('/api/sequences')
      .then((r) => r.json())
      .then(setSequences)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function create() {
    if (!newName.trim()) return
    const res = await fetch('/api/sequences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const seq = await res.json()
    setNewName('')
    setCreating(false)
    window.location.href = `/sequences/${seq.id}`
  }

  async function del(id: string) {
    if (!confirm('Delete this sequence?')) return
    await fetch(`/api/sequences/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sequences</h2>
          <p className="text-sm text-gray-500 mt-1">Multi-step email sequences</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Sequence
        </button>
      </div>

      {creating && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">New Sequence</h3>
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              placeholder="Sequence name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={create}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
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
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : sequences.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <GitBranch className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No sequences yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map((seq) => (
            <div
              key={seq.id}
              className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between hover:border-blue-300 transition-colors"
            >
              <Link href={`/sequences/${seq.id}`} className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900">{seq.name}</div>
                <div className="flex items-center gap-4 mt-1.5">
                  <span className="text-sm text-gray-500">
                    {seq.steps.length} {seq.steps.length === 1 ? 'step' : 'steps'}
                  </span>
                  {seq.steps.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      {seq.steps[seq.steps.length - 1].delayDays +
                        seq.steps.reduce((a, s) => a + s.delayDays, 0)}{' '}
                      day span
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{seq._count.campaigns} campaign(s)</span>
                </div>
                {seq.steps.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {seq.steps.map((step, i) => (
                      <span
                        key={step.id}
                        className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
                      >
                        {i === 0 ? 'Day 0' : `+${step.delayDays}d`}: {step.subject.slice(0, 30)}
                        {step.subject.length > 30 ? '…' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
              <div className="flex items-center gap-2 ml-4">
                <Link
                  href={`/sequences/${seq.id}`}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Edit
                </Link>
                <button
                  onClick={() => del(seq.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
