import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'

export async function requireAuth(request: NextRequest): Promise<NextResponse | any> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const decoded = verify(token, process.env.JWT_SECRET!)
    return decoded
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
