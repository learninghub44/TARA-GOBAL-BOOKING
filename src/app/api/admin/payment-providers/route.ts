import { NextRequest, NextResponse } from 'next/server'
import { requirePlatformAdminRole } from '@/lib/rbac/utils'
import { getProviderSettings, updateProviderSetting } from '@/lib/payments/provider-settings'
import { logAdminAction } from '@/lib/audit/logger'

export async function GET() {
  try {
    await requirePlatformAdminRole(['finance_admin'])
    const settings = await getProviderSettings()
    return NextResponse.json({ providers: settings })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Unauthorized' ? 401 : message.includes('admin') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requirePlatformAdminRole(['finance_admin'])
    const body = await request.json()
    const { provider, is_enabled, is_default, priority, notes } = body

    if (!provider || !['paystack', 'pesapal', 'mpesa'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    const result = await updateProviderSetting(
      { provider, is_enabled, is_default, priority, notes },
      admin.id
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    await logAdminAction(
      admin.id,
      'payment_provider_updated',
      'payment_provider_settings',
      provider,
      getClientIP(request),
      request.headers.get('user-agent') || undefined
    )

    const settings = await getProviderSettings()
    return NextResponse.json({ success: true, providers: settings })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Unauthorized' ? 401 : message.includes('admin') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'
}
