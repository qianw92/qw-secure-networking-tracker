import { useState } from 'react'
import { auth } from '@/lib/neon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type Mode = 'signin' | 'signup'

/**
 * Sign-in / sign-up screen.
 *
 * No password handling of our own: the email and password go straight to Neon
 * Managed Better Auth over HTTPS. We never see, store, or hash a password.
 */
export function AuthForm() {
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)

    try {
      const result =
        mode === 'signup'
          ? await auth.signUp.email({ email, password, name: name || email })
          : await auth.signIn.email({ email, password })

      // The SDK reports failures on the result object rather than throwing.
      if (result?.error) {
        setError(result.error.message ?? 'Something went wrong. Please try again.')
      }
      // On success useSession() updates and App swaps this screen out.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </CardTitle>
          <CardDescription>
            {mode === 'signin'
              ? 'Sign in to see your networking contacts.'
              : 'Start tracking the people you meet at Berkeley.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            {mode === 'signup' && (
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Qianyin Wu"
                  autoComplete="name"
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@berkeley.edu"
                autoComplete="email"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
              {mode === 'signup' && (
                <p className="text-xs text-muted-foreground">At least 8 characters.</p>
              )}
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            <Button type="submit" disabled={busy} className="w-full">
              {busy
                ? 'Working…'
                : mode === 'signin'
                  ? 'Sign in'
                  : 'Create account'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              className="font-medium text-foreground underline underline-offset-4"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin')
                setError(null)
              }}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
