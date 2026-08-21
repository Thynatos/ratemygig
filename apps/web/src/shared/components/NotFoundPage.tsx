import { Link } from 'react-router-dom'

/**
 * A blank slot on the board. The 404 states what happened and offers the two
 * ways back in — it does not joke about it.
 */
export function NotFoundPage() {
    return (
        <div className="min-h-screen bg-groove flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md">
                <span className="score mb-6 inline-flex" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map(i => (
                        <span key={i} className="score-slot w-[22px] h-[34px]" />
                    ))}
                </span>

                <p className="voice-label text-bone-faint mb-3">Error 404</p>
                <h1 className="voice-board text-board-lg text-bone">Nothing at this address</h1>
                <p className="board-lede">
                    The page has moved, been deleted, or the link was mistyped.
                </p>

                <div className="mt-7 flex flex-wrap gap-2">
                    <Link to="/" className="btn-primary">
                        See what's on
                    </Link>
                    <Link to="/artists" className="btn-secondary">
                        Browse artists
                    </Link>
                    <Link to="/venues" className="btn-secondary">
                        Browse venues
                    </Link>
                </div>
            </div>
        </div>
    )
}
