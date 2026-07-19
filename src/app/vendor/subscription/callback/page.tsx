'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'

export default function SubscriptionCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'checking' | 'completed' | 'failed' | 'pending'>('checking')

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref') || searchParams.get('OrderTrackingId')

    let cancelled = false

    async function poll() {
      if (!reference) {
        setStatus('failed')
        return
      }
      for (let i = 0; i < 10; i++) {
        const res = await fetch(`/api/vendor/subscription/verify?reference=${reference}`)
        const data = await res.json()
        if (cancelled) return

        if (data.status === 'completed') {
          setStatus('completed')
          setTimeout(() => router.push('/vendor/dashboard?subscription=active'), 1500)
          return
        }
        if (data.status === 'failed') {
          setStatus('failed')
          return
        }
        await new Promise((r) => setTimeout(r, 2000))
      }
      setStatus('pending')
    }

    poll()
    return () => {
      cancelled = true
    }
  }, [searchParams, router])

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      {status === 'checking' && (
        <>
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
          <h1 className="text-xl font-semibold">Confirming your payment...</h1>
          <p className="text-muted-foreground mt-2">This only takes a moment.</p>
        </>
      )}
      {status === 'completed' && (
        <>
          <CheckCircle2 className="h-10 w-10 mx-auto mb-4 text-green-600" />
          <h1 className="text-xl font-semibold">Subscription active</h1>
          <p className="text-muted-foreground mt-2">Redirecting to your dashboard...</p>
        </>
      )}
      {status === 'pending' && (
        <>
          <Loader2 className="h-10 w-10 mx-auto mb-4 text-amber-600" />
          <h1 className="text-xl font-semibold">Still processing</h1>
          <p className="text-muted-foreground mt-2 mb-4">
            Your payment provider hasn&apos;t confirmed yet. This can take a few minutes — check back shortly.
          </p>
          <Link href="/vendor/dashboard" className={buttonVariants()}>
            Go to dashboard
          </Link>
        </>
      )}
      {status === 'failed' && (
        <>
          <AlertCircle className="h-10 w-10 mx-auto mb-4 text-destructive" />
          <h1 className="text-xl font-semibold">Payment not completed</h1>
          <p className="text-muted-foreground mt-2 mb-4">You can try again with a different payment method.</p>
          <Link href="/vendor/subscription" className={buttonVariants()}>
            Try again
          </Link>
        </>
      )}
    </div>
  )
}
