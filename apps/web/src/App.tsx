import { auth } from '@/lib/neon'
import { AuthForm } from '@/components/AuthForm'
import { ContactsPage } from '@/components/ContactsPage'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'

export default function App() {
  const { data: session, isPending } = auth.useSession()

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (!session) {
    return (
      <>
        <AuthForm />
        <Toaster position="top-center" />
      </>
    )
  }

  return (
    <div className="min-h-svh bg-muted/30">
      {/* California Gold rule under the Berkeley Blue header. */}
      <header className="border-b-4 border-california-gold bg-berkeley-blue text-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-california-gold" />
            <div className="min-w-0">
              <h1 className="text-lg font-semibold">Network Tracker</h1>
              <p className="truncate text-sm text-white/70">{session.user.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={() => auth.signOut()}
          >
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <ContactsPage />
      </main>

      {/* Confirms an action worked. Without this, a successful save and a
          silently failed one look identical. */}
      <Toaster position="top-center" />
    </div>
  )
}
