import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
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
                <div className="min-h-screen flex items-center justify-center p-4 bg-surface-950">
                    <div className="glass-card max-w-md w-full p-8 text-center">
                        {/* Icon */}
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                        </div>

                        {/* Message */}
                        <h1 className="text-2xl font-display font-bold text-white mb-2">
                            Something went wrong
                        </h1>
                        <p className="text-surface-400 mb-6">
                            We encountered an unexpected error. Don't worry, your data is safe.
                        </p>

                        {/* Error details (dev only) */}
                        {import.meta.env.DEV && this.state.error && (
                            <details className="mb-6 text-left">
                                <summary className="cursor-pointer text-sm text-surface-500 hover:text-surface-400">
                                    Technical details
                                </summary>
                                <pre className="mt-2 p-3 rounded-lg bg-surface-900 text-red-400 text-xs overflow-auto max-h-32">
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

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button variant="secondary" onClick={this.handleRetry}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Try Again
                            </Button>
                            <Button onClick={this.handleGoHome}>
                                <Home className="w-4 h-4 mr-2" />
                                Go Home
                            </Button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
