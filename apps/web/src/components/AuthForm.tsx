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
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel. Berkeley Blue with a California Gold rule.
          Hidden below lg: on a phone it would push the form off-screen,
          and signing in is the job -- the branding is not. */}
      <aside className="relative hidden flex-col justify-between bg-berkeley-blue p-12 text-white lg:flex">
        <div className="flex items-center gap-2 text-sm font-medium tracking-wide text-white/70">
          <span className="inline-block h-2 w-2 rounded-full bg-california-gold" />
          UC BERKELEY · HAAS
        </div>

        <div>
          <h1 className="text-5xl leading-tight font-semibold">Network Tracker</h1>
          <div className="mt-6 h-1 w-16 rounded bg-california-gold" />
          <p className="mt-6 max-w-sm text-xl text-white/80">
            Network tracking made easy.
          </p>
        </div>

        <p className="max-w-sm text-sm text-white/60">
          Keep track of everyone you meet at Berkeley — who they are, where you
          met, and what to follow up on. Your list is yours alone.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-sm border-0 bg-transparent shadow-none sm:border sm:bg-card sm:shadow-sm">
          {/* Shown only on small screens, where the brand panel is hidden. */}
          <div className="mb-2 flex items-center gap-2 px-6 lg:hidden">
            <span className="inline-block h-2 w-2 rounded-full bg-california-gold" />
            <span className="text-sm font-semibold text-berkeley-blue">Network Tracker</span>
          </div>

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
                  placeholder="Your name"
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
      </main>
    </div>
  )
}
