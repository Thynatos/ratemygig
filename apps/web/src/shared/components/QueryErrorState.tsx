import { Button } from './ui/Button'

interface Props {
    title?: string
    message?: string
    onRetry?: () => void
    retrying?: boolean
}

/**
 * Inline error state for a failed data query (A13).
 *
 * Sections must never render "No X yet" for a thrown query — that is what
 * let production bugs hide for months. Render this instead, wired to the
 * query's `refetch`.
 *
 * Copy rule (PRODUCT.md §6): name the problem and the recovery. Never
 * apologise, never say "oops".
 */
export function QueryErrorState({
    title = "Couldn't load this section",
    message = 'The request failed before the data arrived.',
    onRetry,
    retrying,
}: Props) {
    return (
        <div className="border border-struck bg-board px-5 py-8 text-center" role="alert">
            <p className="voice-label text-struck mb-2.5">Error</p>
            <h3 className="voice-slot text-ui text-bone mb-1.5">{title}</h3>
            <p className="text-ui-sm text-bone-dim mb-4">{message}</p>
            {onRetry && (
                <Button variant="secondary" size="sm" onClick={onRetry} isLoading={retrying}>
                    Try again
                </Button>
            )}
        </div>
    )
}
