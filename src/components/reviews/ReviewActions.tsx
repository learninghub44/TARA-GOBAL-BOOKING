'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Flag, X } from 'lucide-react'

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'offensive', label: 'Offensive content' },
  { value: 'fake', label: 'Fake review' },
  { value: 'irrelevant', label: 'Irrelevant' },
  { value: 'other', label: 'Other' },
] as const

interface ReviewActionsProps {
  reviewId: string
  initialHelpfulCount?: number
  initialNotHelpfulCount?: number
}

export function ReviewActions({
  reviewId,
  initialHelpfulCount = 0,
  initialNotHelpfulCount = 0,
}: ReviewActionsProps) {
  const [helpfulCount, setHelpfulCount] = useState(initialHelpfulCount)
  const [notHelpfulCount, setNotHelpfulCount] = useState(initialNotHelpfulCount)
  const [myVote, setMyVote] = useState<'helpful' | 'not_helpful' | null>(null)
  const [voting, setVoting] = useState(false)

  const [showReportForm, setShowReportForm] = useState(false)
  const [reportEmail, setReportEmail] = useState('')
  const [reportReason, setReportReason] = useState<(typeof REPORT_REASONS)[number]['value']>('spam')
  const [reportDetails, setReportDetails] = useState('')
  const [reportStatus, setReportStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')

  async function castVote(voteType: 'helpful' | 'not_helpful') {
    if (voting || myVote === voteType) return
    setVoting(true)
    try {
      const res = await fetch(`/api/reviews/${reviewId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote_type: voteType }),
      })
      if (!res.ok) throw new Error('vote failed')
      const data = await res.json()
      setHelpfulCount(data.helpful_count)
      setNotHelpfulCount(data.not_helpful_count)
      setMyVote(voteType)
    } catch {
      // Silent fail is fine here -- voting is a low-stakes action.
    } finally {
      setVoting(false)
    }
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault()
    setReportStatus('submitting')
    try {
      const res = await fetch(`/api/reviews/${reviewId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reported_by_email: reportEmail,
          reason: reportReason,
          details: reportDetails || undefined,
        }),
      })
      if (!res.ok) throw new Error('report failed')
      setReportStatus('done')
    } catch {
      setReportStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => castVote('helpful')}
          disabled={voting}
          className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors ${
            myVote === 'helpful' ? 'bg-brand-navy/10 text-brand-navy' : 'text-muted-foreground hover:text-brand-navy'
          }`}
        >
          <ThumbsUp className="h-4 w-4" />
          Helpful ({helpfulCount})
        </button>
        <button
          type="button"
          onClick={() => castVote('not_helpful')}
          disabled={voting}
          className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors ${
            myVote === 'not_helpful' ? 'bg-brand-navy/10 text-brand-navy' : 'text-muted-foreground hover:text-brand-navy'
          }`}
        >
          <ThumbsDown className="h-4 w-4" />
          Not helpful ({notHelpfulCount})
        </button>
        <button
          type="button"
          onClick={() => setShowReportForm((v) => !v)}
          className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground hover:text-destructive transition-colors"
        >
          <Flag className="h-4 w-4" />
          Report
        </button>
      </div>

      {showReportForm && reportStatus !== 'done' && (
        <form onSubmit={submitReport} className="flex flex-col gap-2 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">Report this review</span>
            <button type="button" onClick={() => setShowReportForm(false)} aria-label="Close">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <input
            type="email"
            required
            placeholder="Your email"
            value={reportEmail}
            onChange={(e) => setReportEmail(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm"
          />
          <select
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value as typeof reportReason)}
            className="rounded-md border px-2 py-1.5 text-sm"
          >
            {REPORT_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Additional details (optional)"
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            maxLength={1000}
            rows={2}
            className="rounded-md border px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={reportStatus === 'submitting'}
            className="rounded-md bg-brand-navy px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {reportStatus === 'submitting' ? 'Submitting…' : 'Submit report'}
          </button>
          {reportStatus === 'error' && (
            <span className="text-xs text-destructive">Something went wrong. Please try again.</span>
          )}
        </form>
      )}
      {reportStatus === 'done' && (
        <p className="text-xs text-muted-foreground">Thanks -- our team will review this.</p>
      )}
    </div>
  )
}
