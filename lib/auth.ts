import { NextRequest, NextResponse } from 'next/server'

export async function requireAuth(request: NextRequest): Promise<NextResponse | any> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Make a request to the backend to verify the token
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/admin/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ error: errorData.detail || 'Unauthorized' }, { status: response.status })
    }

    const decoded = await response.json()
    return decoded // This should contain user info if verified
  } catch (error) {
    console.error('Authentication error:', error)
    return NextResponse.json({ error: 'Authentication service error' }, { status: 500 })
  }
}
