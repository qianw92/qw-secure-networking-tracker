import { useState } from 'react'
import { deleteContact, type Contact } from '@/lib/contacts'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type Props = {
  /** The contact being deleted, or null when the dialog is closed. */
  contact: Contact | null
  onClose: () => void
  onDeleted: () => void
}

/**
 * Deleting is irreversible and one click away, so it asks first and names
 * the contact -- a bare "Are you sure?" does not help someone who clicked
 * the wrong row.
 */
export function DeleteContactDialog({ contact, onClose, onDeleted }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!contact) return
    setError(null)
    setDeleting(true)

    try {
      await deleteContact(contact.id)
      onDeleted()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this contact.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={Boolean(contact)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {contact?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes this contact from your list. It cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              // Keep the dialog open if the request fails, so the error is
              // readable instead of vanishing with the dialog.
              e.preventDefault()
              void handleDelete()
            }}
            disabled={deleting}
            variant="destructive"
          >
            {deleting ? 'Deleting…' : 'Delete contact'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
