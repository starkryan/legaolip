// Better Auth client utilities
const BASE_URL = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:3000"

export async function signIn(email: string, password: string) {
  const response = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      rememberMe: true
    }),
    credentials: 'include'
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Login failed')
  }

  return response.json()
}

export async function signUp(email: string, password: string, name?: string) {
  const response = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      name,
      callbackURL: '/dashboard'
    }),
    credentials: 'include'
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Sign up failed')
  }

  return response.json()
}

export async function signOut() {
  const response = await fetch(`${BASE_URL}/api/auth/sign-out`, {
    method: 'POST',
    credentials: 'include'
  })

  return response.json()
}

export async function getSession() {
  const response = await fetch(`${BASE_URL}/api/auth/get-session`, {
    credentials: 'include'
  })

  if (!response.ok) {
    return null
  }

  return response.json()
}
