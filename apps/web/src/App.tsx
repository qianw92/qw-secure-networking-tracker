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
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">Networking Tracker</h1>
            <p className="truncate text-sm text-muted-foreground">{session.user.email}</p>
          </div>
          <Button variant="outline" onClick={() => auth.signOut()}>
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
