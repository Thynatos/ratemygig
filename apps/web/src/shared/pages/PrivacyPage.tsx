export function PrivacyPage() {
    return (
        <div className="page-container max-w-3xl mx-auto">
            <h1 className="section-title mb-6">Privacy Policy</h1>
            <div className="prose prose-invert max-w-none">
                <p className="text-surface-300 text-lg leading-relaxed">
                    Your privacy is important to us. This policy outlines how RateMyGig collects, uses, and protects your personal information.
                </p>
                <h2 className="text-xl font-semibold text-white mt-6 mb-3">Information We Collect</h2>
                <p className="text-surface-400">
                    We collect your email, display name, and profile information when you create an account. Your reviews, attendance records, and follows are stored to provide you with personalized features.
                </p>
                <h2 className="text-xl font-semibold text-white mt-6 mb-3">How We Use Your Information</h2>
                <p className="text-surface-400">
                    Your data is used to provide the core features of RateMyGig: event discovery, reviews, social features, and personalized recommendations. We do not sell your personal data to third parties.
                </p>
                <h2 className="text-xl font-semibold text-white mt-6 mb-3">Contact</h2>
                <p className="text-surface-400">
                    For privacy-related inquiries, please reach out through our support channels.
                </p>
            </div>
        </div>
    )
}