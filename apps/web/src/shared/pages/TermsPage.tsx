export function TermsPage() {
    return (
        <div className="page-container max-w-3xl mx-auto">
            <h1 className="section-title mb-6">Terms of Service</h1>
            <div className="prose prose-invert max-w-none">
                <p className="text-surface-300 text-lg leading-relaxed">
                    By using RateMyGig, you agree to the following terms.
                </p>
                <h2 className="text-xl font-semibold text-white mt-6 mb-3">Use of Service</h2>
                <p className="text-surface-400">
                    RateMyGig provides a platform for discovering live events, sharing reviews, and connecting with other music fans. You agree to use the service responsibly and not abuse the platform.
                </p>
                <h2 className="text-xl font-semibold text-white mt-6 mb-3">User Content</h2>
                <p className="text-surface-400">
                    Reviews and other content you submit remain yours. By posting, you grant RateMyGig a license to display and distribute your content within the platform.
                </p>
                <h2 className="text-xl font-semibold text-white mt-6 mb-3">Disclaimer</h2>
                <p className="text-surface-400">
                    RateMyGig provides event information for convenience. We are not responsible for the accuracy of event details, cancellations, or changes. Always verify event details with the official source.
                </p>
            </div>
        </div>
    )
}