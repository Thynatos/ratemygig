import { Link } from 'react-router-dom'
import { BoardHeader } from '@/shared/components/ui/Board'

/** Read mode: structure for comprehension, one measure, no columns. */
export function AboutPage() {
    return (
        <div className="page page-body max-w-3xl">
            <BoardHeader
                title="What this is"
                lede="ratemygig is a record of the gigs you've actually been to."
            />

            <div className="voice-read text-bone-mid space-y-5">
                <p>
                    A film is the same film in every cinema. A gig is never the same twice — the
                    same band on the same tour is a different night in Glasgow than in Bristol, and
                    the room is half of what you remember. So the thing worth keeping isn't a
                    rating of the band. It's a rating of <em>that night</em>: this artist, in this
                    room, on this date.
                </p>

                <p>
                    That's what this is for. You find something on, you go, you mark that you were
                    there, and you write down what it was like — a score, a few lines, a couple of
                    photos, the setlist if you can remember it. Over a few years that turns into
                    something you can't get anywhere else: your own archive, counted.
                </p>
            </div>

            <section className="mt-10">
                <h2 className="voice-label text-bone-dim mb-3">What you can do</h2>
                <dl className="rail-list">
                    <div className="row">
                        <div className="row-body">
                            <dt className="voice-slot text-ui text-bone">Find what's on</dt>
                            <dd className="text-ui-sm text-bone-dim">
                                Upcoming gigs by city and date, with links out to whoever is
                                selling the tickets.
                            </dd>
                        </div>
                    </div>
                    <div className="row">
                        <div className="row-body">
                            <dt className="voice-slot text-ui text-bone">Log the ones you go to</dt>
                            <dd className="text-ui-sm text-bone-dim">
                                A score out of five, a review, photos, tags, and the setlist. Save
                                it as a draft if you start it on the bus home.
                            </dd>
                        </div>
                    </div>
                    <div className="row">
                        <div className="row-body">
                            <dt className="voice-slot text-ui text-bone">Get your history back</dt>
                            <dd className="text-ui-sm text-bone-dim">
                                Your year counted: gigs, rooms, most-seen artists. Export the whole
                                lot as CSV whenever you want.
                            </dd>
                        </div>
                    </div>
                    <div className="row">
                        <div className="row-body">
                            <dt className="voice-slot text-ui text-bone">Compare rooms</dt>
                            <dd className="text-ui-sm text-bone-dim">
                                Aggregate scores for artists and venues, filterable by year and
                                city — so you can settle which room a band actually sounds best in.
                            </dd>
                        </div>
                    </div>
                </dl>
            </section>

            <section className="mt-10">
                <h2 className="voice-label text-bone-dim mb-3">What it isn't</h2>
                <p className="voice-read text-bone-dim">
                    We don't sell tickets and we take no cut from the sites that do. There's no
                    algorithmic feed and no follower leaderboard — following exists so you can
                    disagree with your friends about a show, not so anyone can build an audience.
                </p>
            </section>

            <p className="mt-10 pt-5 border-t border-rail">
                <Link to="/" className="btn-primary">
                    See what's on
                </Link>
            </p>
        </div>
    )
}
