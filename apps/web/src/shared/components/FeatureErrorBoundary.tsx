import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './ui/Button'
import { captureException } from '../lib/monitoring'

interface Props {
    children: ReactNode
    title?: string
}

interface State {
    hasError: boolean
    error: Error | null
}

export class FeatureErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[FeatureErrorBoundary] Caught error:', {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
        })
        captureException(error, {
            componentStack: errorInfo.componentStack,
            boundary: this.props.title || 'feature',
        })
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="page-container">
                    <div className="glass-card max-w-lg mx-auto p-8 text-center">
                        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-red-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-white mb-2">
                            {this.props.title || 'Something went wrong'}
                        </h2>
                        <p className="text-surface-400 text-sm mb-4">
                            This section encountered an error. You can try again or explore other parts of the app.
                        </p>
                        <Button variant="secondary" size="sm" onClick={this.handleRetry}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Try Again
                        </Button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
