import { Component, ReactNode } from 'react'
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
                <div className="page page-body">
                    <div
                        role="alert"
                        className="max-w-lg mx-auto border border-struck bg-board px-6 py-8 text-center"
                    >
                        <p className="voice-label text-struck mb-2.5">Error</p>
                        <h2 className="voice-slot text-board-md text-bone mb-2">
                            {this.props.title
                                ? `${this.props.title} didn't load`
                                : "This section didn't load"}
                        </h2>
                        <p className="text-ui text-bone-dim mb-5">
                            Something in this part of the app broke. The rest of the board still
                            works.
                        </p>
                        <Button variant="secondary" onClick={this.handleRetry}>
                            Try again
                        </Button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
