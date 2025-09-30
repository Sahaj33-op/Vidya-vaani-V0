import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Call the FastAPI backend to verify the token
    // Assuming the backend has an endpoint like /api/v1/auth/verify-token
    // and it returns user data if valid, or throws an error.
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      console.error('NEXT_PUBLIC_BACKEND_URL is not defined');
      return NextResponse.json({ error: 'Internal server error: Backend URL not configured' }, { status: 500 });
    }

    const response = await fetch(`${backendUrl}/api/v1/auth/verify-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.detail || 'Invalid token or unauthorized' }, { status: response.status });
    }

    const userData = await response.json();
    // Ensure the user is an admin (this check might also be done by the backend endpoint)
    if (userData.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: User is not an admin' }, { status: 403 });
    }

    return NextResponse.json(userData, { status: 200 });

  } catch (error) {
    console.error('Error verifying token with backend:', error);
    return NextResponse.json({ error: 'Failed to verify token with backend' }, { status: 500 });
  }
}
