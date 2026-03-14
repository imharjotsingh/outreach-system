'use client'

import { useEffect, useState, useRef } from 'react'
import Papa from 'papaparse'
import { Upload, Search, X, CheckCircle, AlertCircle } from 'lucide-react'

interface Contact {
  id: string
  name: string
  email: string
  company: string | null
  customFields: Record<string, string>
  createdAt: string
}

interface ImportResult {
  imported: number
  failed: number
}

type FieldMap = Record<string, string> // csvHeader -> our field

const CORE_FIELDS = ['name', 'email', 'company']

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // CSV import state
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [fieldMap, setFieldMap] = useState<FieldMap>({})
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showImport, setShowImport] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const limit = 50

  function load() {
    setLoading(true)
    fetch(`/api/contacts?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`)
      .then((r) => r.json())
      .then((d) => {
        setContacts(d.contacts)
        setTotal(d.total)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page, search]) // eslint-disable-line

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields || []
        setCsvHeaders(headers)
        setCsvRows(result.data)
        // Auto-map obvious headers
        const autoMap: FieldMap = {}
        headers.forEach((h) => {
          const lower = h.toLowerCase()
          if (lower.includes('name') && !lower.includes('company') && !lower.includes('last')) autoMap[h] = 'name'
          else if (lower === 'email' || lower.includes('email')) autoMap[h] = 'email'
          else if (lower.includes('company') || lower.includes('org')) autoMap[h] = 'company'
        })
        setFieldMap(autoMap)
        setShowImport(true)
        setImportResult(null)
      },
    })
    e.target.value = ''
  }

  async function handleImport() {
    if (!fieldMap['email'] && !Object.values(fieldMap).includes('email')) {
      alert('Please map the email column')
      return
    }

    setImporting(true)
    const emailCol = Object.entries(fieldMap).find(([, v]) => v === 'email')?.[0]
    const nameCol = Object.entries(fieldMap).find(([, v]) => v === 'name')?.[0]
    const companyCol = Object.entries(fieldMap).find(([, v]) => v === 'company')?.[0]

    const contacts = csvRows
      .filter((row) => emailCol && row[emailCol])
      .map((row) => {
        const customFields: Record<string, string> = {}
        csvHeaders.forEach((h) => {
          if (!fieldMap[h] || !CORE_FIELDS.includes(fieldMap[h])) {
            // Unmapped or custom → store as custom field
            if (row[h]) customFields[fieldMap[h] || h] = row[h]
          }
        })
        return {
          email: emailCol ? row[emailCol] : '',
          name: nameCol ? row[nameCol] : (emailCol ? row[emailCol].split('@')[0] : ''),
          company: companyCol ? row[companyCol] : undefined,
          customFields,
        }
      })

    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts }),
    })
    const result = await res.json()
    setImportResult(result)
    setImporting(false)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contacts</h2>
          <p className="text-sm text-gray-500 mt-1">{total.toLocaleString()} total</p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Import CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      </div>

      {/* CSV Import Panel */}
      {showImport && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Map CSV columns ({csvRows.length} rows)</h3>
            <button onClick={() => setShowImport(false)}>
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {csvHeaders.map((header) => (
              <div key={header} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600 truncate">{header}</label>
                <select
                  value={fieldMap[header] || ''}
                  onChange={(e) =>
                    setFieldMap((prev) => ({ ...prev, [header]: e.target.value }))
                  }
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
                >
                  <option value="">— custom field —</option>
                  <option value="name">Name</option>
                  <option value="email">Email *</option>
                  <option value="company">Company</option>
                  {csvHeaders
                    .filter((h) => h !== header)
                    .map((h) => (
                      <option key={h} value={h}>
                        {h} (custom)
                      </option>
                    ))}
                </select>
              </div>
            ))}
          </div>

          {importResult ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700">
                Imported {importResult.imported} contacts
                {importResult.failed > 0 && `, ${importResult.failed} failed`}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {importing ? 'Importing…' : `Import ${csvRows.length} contacts`}
              </button>
              <span className="text-xs text-gray-500">
                Existing contacts will be updated by email
              </span>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email, company…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Custom fields</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  {search ? 'No contacts found' : 'No contacts yet — import a CSV to get started'}
                </td>
              </tr>
            ) : (
              contacts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email}</td>
                  <td className="px-4 py-3 text-gray-600">{c.company || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {Object.keys(c.customFields).length > 0
                      ? Object.keys(c.customFields).join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              disabled={page * limit >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
