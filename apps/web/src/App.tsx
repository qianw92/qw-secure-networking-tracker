import { auth } from '@/lib/neon'
import { AuthForm } from '@/components/AuthForm'
import { Button } from '@/components/ui/button'

export default function App() {
  // useSession() re-renders this component whenever the user signs in or out.
  const { data: session, isPending } = auth.useSession()

  // LOADING state — we don't yet know if anyone is signed in.
  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  // SIGNED OUT state.
  if (!session) {
    return <AuthForm />
  }

  // SIGNED IN state. Contacts go here next.
  return (
    <div className="min-h-svh bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold">Networking Tracker</h1>
            <p className="text-sm text-muted-foreground">{session.user.email}</p>
          </div>
          <Button variant="outline" onClick={() => auth.signOut()}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-lg border border-dashed bg-background p-10 text-center">
          <p className="font-medium">You're signed in.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your contact list will appear here in the next step.
          </p>
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            user id: {session.user.id}
          </p>
        </div>
      </main>
    </div>
  )
}
