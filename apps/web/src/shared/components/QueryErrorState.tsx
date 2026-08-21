import { AlertTriangle, RefreshCw } from 'lucide-react'
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
 * query's `refetch`. Visual language matches FeatureErrorBoundary.
 */
export function QueryErrorState({
    title = 'Couldn\'t load this section',
    message = 'Something went wrong while loading. You can try again.',
    onRetry,
    retrying,
}: Props) {
    return (
        <div className="py-8 text-center" role="alert">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
            <p className="text-surface-400 text-sm mb-4">{message}</p>
            {onRetry && (
                <Button variant="secondary" size="sm" onClick={onRetry} isLoading={retrying}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                </Button>
            )}
        </div>
    )
}
