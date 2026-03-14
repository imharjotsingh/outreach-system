'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Trash2, ArrowLeft, Save, GripVertical, Info } from 'lucide-react'

interface Step {
  id?: string
  stepNumber: number
  subject: string
  body: string
  delayDays: number
}

interface Sequence {
  id: string
  name: string
  steps: Step[]
}

const TEMPLATE_VARS = ['{{name}}', '{{first_name}}', '{{last_name}}', '{{email}}', '{{company}}']

export default function SequenceBuilderPage() {
  const { id } = useParams()
  const router = useRouter()
  const [sequence, setSequence] = useState<Sequence | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/sequences/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setSequence(data)
        setName(data.name)
        setSteps(data.steps.length > 0 ? data.steps : [defaultStep(1)])
      })
  }, [id])

  function defaultStep(num: number): Step {
    return { stepNumber: num, subject: '', body: '', delayDays: num === 1 ? 0 : 3 }
  }

  function addStep() {
    setSteps((prev) => [...prev, defaultStep(prev.length + 1)])
  }

  function removeStep(index: number) {
    setSteps((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepNumber: i + 1 }))
    )
  }

  function updateStep(index: number, field: keyof Step, value: string | number) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  async function save() {
    setSaving(true)
    await fetch(`/api/sequences/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, steps }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!sequence) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-100 rounded w-64" />
        <div className="h-48 bg-gray-100 rounded" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/sequences')} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </button>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-2xl font-bold text-gray-900 bg-transparent border-none outline-none focus:bg-white focus:border focus:border-gray-300 focus:px-2 rounded"
          placeholder="Sequence name"
        />
        <button
          onClick={save}
          disabled={saving}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {/* Template variables hint */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6 text-sm">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-blue-700">
          Use template variables:{' '}
          {TEMPLATE_VARS.map((v) => (
            <code key={v} className="bg-blue-100 px-1 rounded text-xs mr-1">
              {v}
            </code>
          ))}
          + any custom fields from your CSV
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Step header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <GripVertical className="h-4 w-4 text-gray-300" />
              <span className="text-sm font-semibold text-gray-700">Step {index + 1}</span>
              {index === 0 ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Send immediately
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Send</span>
                  <input
                    type="number"
                    min={1}
                    value={step.delayDays}
                    onChange={(e) => updateStep(index, 'delayDays', parseInt(e.target.value) || 1)}
                    className="w-14 text-xs border border-gray-300 rounded px-1.5 py-0.5 text-center"
                  />
                  <span className="text-xs text-gray-500">days after previous step</span>
                </div>
              )}
              <button
                onClick={() => removeStep(index)}
                className="ml-auto p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Step body */}
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject line</label>
                <input
                  type="text"
                  placeholder="e.g. Quick question for {{company}}"
                  value={step.subject}
                  onChange={(e) => updateStep(index, 'subject', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email body (HTML or plain text)</label>
                <textarea
                  rows={8}
                  placeholder={`Hi {{first_name}},\n\nI noticed {{company}} is...\n\nBest,\n{{sender_name}}`}
                  value={step.body}
                  onChange={(e) => updateStep(index, 'body', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-y"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addStep}
        className="mt-4 flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 w-full justify-center transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add step
      </button>
    </div>
  )
}
