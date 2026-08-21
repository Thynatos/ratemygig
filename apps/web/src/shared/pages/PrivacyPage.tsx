import { BoardHeader } from '@/shared/components/ui/Board'

/**
 * Read mode. Same commitments as before, restructured for scanning: a labelled
 * rail per section, one measure, no invented promises.
 */
export function PrivacyPage() {
    return (
        <div className="page page-body max-w-3xl">
            <BoardHeader
                title="Privacy"
                lede="What we hold about you, why we hold it, and what we never do with it."
            />

            <div className="space-y-8">
                <section>
                    <h2 className="voice-label text-bone-dim border-b border-rail pb-2 mb-3">
                        What we collect
                    </h2>
                    <p className="voice-read text-bone-mid">
                        Your email address, and the display name and profile details you choose to
                        add. Everything else is what you put in yourself: the gigs you mark as
                        attended, the reviews and photos you write, and the artists, venues and
                        people you follow.
                    </p>
                </section>

                <section>
                    <h2 className="voice-label text-bone-dim border-b border-rail pb-2 mb-3">
                        What we use it for
                    </h2>
                    <p className="voice-read text-bone-mid">
                        Running the product: showing you gigs, keeping your archive, powering the
                        aggregate ratings, and sending the notifications you've left switched on.
                        Nothing else.
                    </p>
                </section>

                <section>
                    <h2 className="voice-label text-bone-dim border-b border-rail pb-2 mb-3">
                        What we don't do
                    </h2>
                    <p className="voice-read text-bone-mid">
                        We do not sell your personal data to anyone.
                    </p>
                </section>

                <section>
                    <h2 className="voice-label text-bone-dim border-b border-rail pb-2 mb-3">
                        What you control
                    </h2>
                    <p className="voice-read text-bone-mid">
                        Your profile is public or private, and each review is public or private on
                        its own. A private review still counts towards your own statistics but is
                        not readable by anyone else. Notification types are individually
                        switchable in your profile, and you can export your whole gig history as a
                        CSV file at any time from My gigs.
                    </p>
                </section>

                <section>
                    <h2 className="voice-label text-bone-dim border-b border-rail pb-2 mb-3">
                        Getting in touch
                    </h2>
                    <p className="voice-read text-bone-mid">
                        For anything privacy-related, contact us through our support channels.
                    </p>
                </section>
            </div>
        </div>
    )
}
