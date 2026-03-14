'use client'

import { useEffect, useState } from 'react'
import { Users, Mail, MousePointer, MessageSquare, TrendingUp, Layers } from 'lucide-react'

interface Stats {
  totalContacts: number
  totalSequences: number
  totalCampaigns: number
  emailsSent: number
  emailsDelivered: number
  emailsOpened: number
  emailsClicked: number
  emailsBounced: number
  contactsReplied: number
  contactsActive: number
  contactsCompleted: number
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string
  value: number | string
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then(setStats)
  }, [])

  if (!stats) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-28" />
          ))}
        </div>
      </div>
    )
  }

  const openRate = stats.emailsSent > 0 ? ((stats.emailsOpened / stats.emailsSent) * 100).toFixed(1) : '0'
  const replyRate =
    stats.contactsActive + stats.contactsCompleted + stats.contactsReplied > 0
      ? (
          (stats.contactsReplied /
            (stats.contactsActive + stats.contactsCompleted + stats.contactsReplied)) *
          100
        ).toFixed(1)
      : '0'

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Overview</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Contacts"
          value={stats.totalContacts.toLocaleString()}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard label="Sequences" value={stats.totalSequences} icon={Layers} color="bg-purple-500" />
        <StatCard label="Campaigns" value={stats.totalCampaigns} icon={TrendingUp} color="bg-green-500" />
        <StatCard
          label="Active in Sequence"
          value={stats.contactsActive.toLocaleString()}
          icon={Mail}
          color="bg-orange-500"
        />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Performance</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Emails Sent"
          value={stats.emailsSent.toLocaleString()}
          icon={Mail}
          color="bg-gray-500"
        />
        <StatCard
          label="Open Rate"
          value={`${openRate}%`}
          sub={`${stats.emailsOpened.toLocaleString()} opened`}
          icon={MousePointer}
          color="bg-blue-500"
        />
        <StatCard
          label="Click Rate"
          value={
            stats.emailsOpened > 0
              ? `${((stats.emailsClicked / stats.emailsOpened) * 100).toFixed(1)}%`
              : '0%'
          }
          sub={`${stats.emailsClicked.toLocaleString()} clicked`}
          icon={MousePointer}
          color="bg-green-500"
        />
        <StatCard
          label="Reply Rate"
          value={`${replyRate}%`}
          sub={`${stats.contactsReplied.toLocaleString()} replied`}
          icon={MessageSquare}
          color="bg-emerald-500"
        />
      </div>
    </div>
  )
}
