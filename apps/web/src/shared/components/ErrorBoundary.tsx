import { Component, ReactNode } from 'react'
import { Button } from './ui/Button'
import { captureException } from '../lib/monitoring'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
    errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
        })
        captureException(error, { componentStack: errorInfo.componentStack })
        this.setState({ errorInfo })
    }

    handleReload = () => {
        window.location.reload()
    }

    handleGoHome = () => {
        window.location.href = '/'
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="min-h-screen bg-groove flex items-center justify-center p-6">
                    <div
                        role="alert"
                        className="max-w-md w-full border border-struck bg-board px-6 py-8"
                    >
                        <p className="voice-label text-struck mb-3">Error</p>
                        <h1 className="voice-board text-board-lg text-bone">
                            The app stopped
                        </h1>
                        <p className="mt-3 text-ui text-bone-dim">
                            Something broke that we didn't plan for. Nothing you've logged is
                            affected — reloading usually clears it.
                        </p>

                        {import.meta.env.DEV && this.state.error && (
                            <details className="mt-5 text-left">
                                <summary className="cursor-pointer voice-label text-bone-faint hover:text-bone">
                                    Technical details
                                </summary>
                                <pre className="mt-2 p-3 bg-groove border border-rail text-struck voice-data text-[0.6875rem] overflow-auto max-h-40">
                                    {this.state.error.message}
                                    {this.state.error.stack && (
                                        <>
                                            {'\n\n'}
                                            {this.state.error.stack}
                                        </>
                                    )}
                                </pre>
                            </details>
                        )}

                        <div className="mt-6 flex flex-wrap gap-2">
                            <Button onClick={this.handleReload}>Reload the page</Button>
                            <Button variant="secondary" onClick={this.handleRetry}>
                                Try again
                            </Button>
                            <Button variant="ghost" onClick={this.handleGoHome}>
                                Back to what's on
                            </Button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
