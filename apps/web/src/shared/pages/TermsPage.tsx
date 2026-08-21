import { BoardHeader } from '@/shared/components/ui/Board'

/** Read mode. The same terms as before, in the product's own voice. */
export function TermsPage() {
    return (
        <div className="page page-body max-w-3xl">
            <BoardHeader
                title="Terms"
                lede="Using ratemygig means agreeing to these."
            />

            <div className="space-y-8">
                <section>
                    <h2 className="voice-label text-bone-dim border-b border-rail pb-2 mb-3">
                        Using the service
                    </h2>
                    <p className="voice-read text-bone-mid">
                        ratemygig lets you find live events, keep a record of the ones you go to,
                        and read what other people made of them. Use it reasonably and don't abuse
                        the platform or the people on it.
                    </p>
                </section>

                <section>
                    <h2 className="voice-label text-bone-dim border-b border-rail pb-2 mb-3">
                        Your content stays yours
                    </h2>
                    <p className="voice-read text-bone-mid">
                        The reviews, photos and setlists you write remain yours. By posting them
                        you grant ratemygig a licence to display and distribute that content
                        within the platform — nothing wider than that.
                    </p>
                </section>

                <section>
                    <h2 className="voice-label text-bone-dim border-b border-rail pb-2 mb-3">
                        About event listings
                    </h2>
                    <p className="voice-read text-bone-mid">
                        Event details come from third-party sources and are provided as a
                        convenience. We can't guarantee they're accurate, and we're not
                        responsible for cancellations, reschedules or changes. Always check with
                        the venue or the official ticket seller before you travel.
                    </p>
                </section>

                <section>
                    <h2 className="voice-label text-bone-dim border-b border-rail pb-2 mb-3">
                        Tickets
                    </h2>
                    <p className="voice-read text-bone-mid">
                        We don't sell tickets. Ticket links hand you off to other sites, and any
                        purchase you make there is between you and them.
                    </p>
                </section>
            </div>
        </div>
    )
}
