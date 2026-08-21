import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../hooks/useAuth'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'

const emailSchema = z.object({
    email: z.string().email('That does not look like an email address.'),
})

type EmailForm = z.infer<typeof emailSchema>

/** What signing in actually buys you. Real product facts, no marketing. */
const PITCH = [
    ['Log the night', 'Mark a gig as one you were at, then rate the room, the set and the sound.'],
    ['Get it back as numbers', 'Your year counted: gigs, rooms, most-seen artists, a league table of venues.'],
    ['Argue with friends', 'Follow people, react to their reviews, and see who else is going.'],
] as const

export function LoginPage() {
    const { user, signInWithMagicLink, signInWithGoogle } = useAuth()
    const location = useLocation()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [sentTo, setSentTo] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<EmailForm>({
        resolver: zodResolver(emailSchema),
    })

    // Redirect if already logged in
    if (user) {
        const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'
        return <Navigate to={from} replace />
    }

    const onSubmitEmail = async (data: EmailForm) => {
        setIsSubmitting(true)
        setError(null)

        const { error } = await signInWithMagicLink(data.email)

        if (error) {
            setError(error.message)
        } else {
            setSentTo(data.email)
        }

        setIsSubmitting(false)
    }

    const handleGoogleSignIn = async () => {
        setError(null)
        const { error } = await signInWithGoogle()
        if (error) {
            setError(error.message)
        }
    }

    return (
        <div className="min-h-screen bg-groove flex flex-col">
            <header className="border-b border-rail-strong bg-board">
                <div className="page h-16 flex items-center">
                    <Link
                        to="/"
                        className="inline-flex flex-col items-start gap-1 py-2"
                        aria-label="ratemygig — home"
                    >
                        <span className="voice-board text-bone leading-none text-[1.0625rem]">
                            ratemygig
                        </span>
                        <span className="block h-[3px] w-full bg-strip" aria-hidden="true" />
                    </Link>
                </div>
            </header>

            <main className="flex-1 page py-10 sm:py-16">
                <div className="grid gap-10 lg:gap-16 lg:grid-cols-2 items-start">
                    {/* The thesis, for anyone who arrived here first. */}
                    <div className="max-w-lg">
                        <h1 className="voice-board text-board-xl text-bone">
                            Every gig you've been to, kept
                        </h1>
                        <p className="board-lede">
                            ratemygig is a record of the nights you were actually at — what you
                            saw, where, and whether it was any good.
                        </p>

                        <dl className="mt-8 rail-list">
                            {PITCH.map(([title, body]) => (
                                <div key={title} className="row">
                                    <div className="row-body">
                                        <dt className="voice-slot text-ui text-bone">{title}</dt>
                                        <dd className="text-ui-sm text-bone-dim">{body}</dd>
                                    </div>
                                </div>
                            ))}
                        </dl>
                    </div>

                    {/* The sign-in slot. */}
                    <div className="w-full max-w-md lg:justify-self-end border border-rail-strong bg-board">
                        {sentTo ? (
                            <div className="p-6">
                                <p className="strip mb-4">Link sent</p>
                                <h2 className="voice-slot text-board-md text-bone mb-2">
                                    Check your email
                                </h2>
                                <p className="text-ui text-bone-dim mb-5">
                                    We sent a sign-in link to{' '}
                                    <span className="text-bone break-all">{sentTo}</span>. Open it
                                    on this device and you're in. It expires in an hour.
                                </p>
                                <Button variant="secondary" onClick={() => setSentTo(null)}>
                                    Use a different email
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="px-6 py-5 border-b border-rail">
                                    <h2 className="voice-slot text-board-md text-bone">Sign in</h2>
                                    <p className="text-ui-sm text-bone-dim mt-1">
                                        No password. New here? This makes your account.
                                    </p>
                                </div>

                                <div className="p-6">
                                    {error && (
                                        <p
                                            role="alert"
                                            className="border border-struck px-3 py-2.5 mb-5 text-ui-sm text-bone"
                                        >
                                            <span className="voice-label text-struck block mb-1">
                                                Couldn't sign you in
                                            </span>
                                            {error}
                                        </p>
                                    )}

                                    <Button
                                        variant="secondary"
                                        className="w-full"
                                        onClick={handleGoogleSignIn}
                                    >
                                        <svg
                                            className="w-4 h-4"
                                            viewBox="0 0 24 24"
                                            aria-hidden="true"
                                        >
                                            <path
                                                fill="currentColor"
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            />
                                        </svg>
                                        Continue with Google
                                    </Button>

                                    <div className="flex items-center gap-3 my-5">
                                        <span className="flex-1 h-px bg-rail" aria-hidden="true" />
                                        <span className="voice-label text-bone-faint">or</span>
                                        <span className="flex-1 h-px bg-rail" aria-hidden="true" />
                                    </div>

                                    <form onSubmit={handleSubmit(onSubmitEmail)} noValidate>
                                        <Input
                                            type="email"
                                            label="Email"
                                            placeholder="you@example.com"
                                            autoComplete="email"
                                            error={errors.email?.message}
                                            {...register('email')}
                                        />
                                        <Button
                                            type="submit"
                                            className="w-full mt-4"
                                            isLoading={isSubmitting}
                                            loadingLabel="Sending your link"
                                        >
                                            Email me a link
                                        </Button>
                                    </form>

                                    <p className="mt-5 text-ui-sm text-bone-faint">
                                        Signing in means you accept the{' '}
                                        <Link
                                            to="/terms"
                                            className="text-bone-dim underline hover:text-strip"
                                        >
                                            terms
                                        </Link>{' '}
                                        and the{' '}
                                        <Link
                                            to="/privacy"
                                            className="text-bone-dim underline hover:text-strip"
                                        >
                                            privacy notice
                                        </Link>
                                        .
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
