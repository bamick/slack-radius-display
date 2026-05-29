import { NextRequest, NextResponse } from 'next/server'
import { fetchSlackMessages } from '@/lib/slack'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  const displayKey = process.env.DISPLAY_KEY

  if (!displayKey || !key || key !== displayKey) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const messages = await fetchSlackMessages()
    return NextResponse.json(
      {
        ok: true,
        updatedAt: new Date().toISOString(),
        messages,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    )
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Unable to load messages' },
      { status: 502 }
    )
  }
}
