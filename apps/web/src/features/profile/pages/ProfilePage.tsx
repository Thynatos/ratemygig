import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { supabase } from '@/shared/lib/supabase'
import { useUpdateProfile } from '@/features/profile/api/profile'
import { PreferencesForm } from '@/features/profile/components/PreferencesForm'
import { AvatarUpload } from '@/features/profile/components/AvatarUpload'
import { SocialLinksForm } from '@/features/profile/components/SocialLinksForm'
import { GigStatsCard } from '@/features/profile/components/GigStatsCard'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'
import { LoadingPage } from '@/shared/components/ui/Loading'
import { BoardHeader } from '@/shared/components/ui/Board'
import { cn } from '@/shared/lib/utils'

const profileSchema = z.object({
    username: z
        .string()
        .min(3, 'Usernames are at least 3 characters.')
        .max(30, 'Usernames are at most 30 characters.')
        .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers and underscores only.')
        .optional()
        .or(z.literal('')),
    display_name: z.string().max(100, 'Keep it under 100 characters.').optional(),
    bio: z.string().max(500, 'Keep it under 500 characters.').optional(),
    is_profile_public: z.boolean(),
})

type ProfileFormData = z.infer<typeof profileSchema>

export function ProfilePage() {
    const { user } = useAuth()
    const updateProfile = useUpdateProfile()

    const { data: profile, isLoading } = useQuery({
        queryKey: ['profiles', 'detail', user?.id],
        queryFn: async () => {
            if (!user) return null
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (error) throw error
            return data
        },
        enabled: !!user,
    })

    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors },
    } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            username: '',
            display_name: '',
            bio: '',
            is_profile_public: true,
        },
    })

    const isPublic = useWatch({ control, name: 'is_profile_public' })

    useEffect(() => {
        if (profile) {
            setValue('username', profile.username || '')
            setValue('display_name', profile.display_name || '')
            setValue('bio', profile.bio || '')
            setValue('is_profile_public', profile.is_profile_public)
        }
    }, [profile, setValue])

    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
        null
    )

    const onSubmit = async (data: ProfileFormData) => {
        if (!user) return
        setMessage(null)

        updateProfile.mutate(
            {
                userId: user.id,
                username: data.username || null,
                display_name: data.display_name || null,
                bio: data.bio || null,
                is_profile_public: data.is_profile_public,
            },
            {
                onSuccess: () => setMessage({ type: 'success', text: 'Profile saved.' }),
                onError: err => {
                    if ((err as { code?: string }).code === '23505') {
                        setMessage({
                            type: 'error',
                            text: 'That username is taken. Try another.',
                        })
                    } else {
                        setMessage({
                            type: 'error',
                            text: 'The profile did not save. Your changes are still here.',
                        })
                    }
                },
            }
        )
    }

    if (isLoading) return <LoadingPage message="Opening your profile" />

    return (
        <div className="page page-body max-w-3xl">
            <BoardHeader
                title="Your profile"
                lede="How you show up on the board, and what other people can see."
                action={
                    profile?.username && profile.is_profile_public ? (
                        <Link to={`/u/${profile.username}`} className="btn-secondary">
                            View public profile
                        </Link>
                    ) : undefined
                }
            >
                {user && <GigStatsCard userId={user.id} />}
            </BoardHeader>

            <div className="space-y-8">
                <section className="border border-rail bg-board">
                    <h2 className="voice-label text-bone-dim px-4 py-2.5 border-b border-rail">
                        Photo and account
                    </h2>
                    <div className="p-4">
                        <AvatarUpload
                            currentAvatarUrl={profile?.avatar_url || null}
                            userId={user?.id || ''}
                        />
                        {user && (
                            <dl className="mt-5 pt-4 border-t border-rail grid gap-3 sm:grid-cols-2">
                                <div>
                                    <dt className="voice-label text-bone-faint mb-1">
                                        Signed in as
                                    </dt>
                                    <dd className="text-ui text-bone break-all">{user.email}</dd>
                                </div>
                                <div>
                                    <dt className="voice-label text-bone-faint mb-1">Method</dt>
                                    <dd className="text-ui text-bone">
                                        {user.app_metadata?.provider === 'google'
                                            ? 'Google'
                                            : 'Magic link'}
                                    </dd>
                                </div>
                            </dl>
                        )}
                    </div>
                </section>

                {user && (
                    <Link
                        to="/wrapped"
                        className="row row-interactive border border-rail items-center"
                    >
                        <span className="row-body">
                            <span className="row-title">Your year in gigs</span>
                            <span className="row-meta">
                                Counts, top artists and top rooms, one year at a time.
                            </span>
                        </span>
                        <span className="row-end">
                            <span className="voice-label text-strip">Open</span>
                        </span>
                    </Link>
                )}

                <form onSubmit={handleSubmit(onSubmit)} noValidate>
                    <section className="border border-rail bg-board">
                        <h2 className="voice-label text-bone-dim px-4 py-2.5 border-b border-rail">
                            Public details
                        </h2>

                        <div className="p-4 space-y-5">
                            <Input
                                label="Username"
                                placeholder="your_username"
                                autoComplete="off"
                                spellCheck={false}
                                hint="This becomes your profile address: ratemygig.com/u/your_username"
                                error={errors.username?.message}
                                {...register('username')}
                            />

                            <Input
                                label="Display name"
                                placeholder="What people should call you"
                                autoComplete="off"
                                error={errors.display_name?.message}
                                {...register('display_name')}
                            />

                            <Textarea
                                label="Bio"
                                placeholder="What you go to see, and where you usually see it."
                                error={errors.bio?.message}
                                {...register('bio')}
                            />
                        </div>

                        <div className="flex items-center justify-between gap-4 px-4 py-4 border-t border-rail">
                            <div>
                                <p className="voice-label text-bone-dim mb-1">
                                    Who can see your profile
                                </p>
                                <p className="text-ui-sm text-bone-faint">
                                    {isPublic
                                        ? 'Anyone. Your public reviews show on it.'
                                        : 'Only you. Your reviews stay off the public board.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={isPublic}
                                aria-label="Make your profile public"
                                onClick={() => setValue('is_profile_public', !isPublic)}
                                className={cn(
                                    'relative shrink-0 w-14 h-7 border transition-colors duration-150 ease-board',
                                    isPublic
                                        ? 'bg-strip border-strip'
                                        : 'bg-groove border-rail-strong'
                                )}
                            >
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        'absolute top-[3px] w-5 h-5 transition-transform duration-150 ease-board',
                                        isPublic
                                            ? 'translate-x-[30px] bg-strip-ink'
                                            : 'translate-x-[3px] bg-bone-faint'
                                    )}
                                />
                            </button>
                        </div>
                    </section>

                    {message && (
                        <p
                            role="status"
                            className={cn(
                                'mt-4 border px-4 py-3 text-ui',
                                message.type === 'success'
                                    ? 'border-rail-strong bg-board text-bone'
                                    : 'border-struck bg-board text-bone'
                            )}
                        >
                            <span
                                className={cn(
                                    'voice-label mr-2',
                                    message.type === 'success' ? 'text-strip' : 'text-struck'
                                )}
                            >
                                {message.type === 'success' ? 'Saved' : 'Not saved'}
                            </span>
                            {message.text}
                        </p>
                    )}

                    <div className="mt-4 flex justify-end">
                        <Button
                            type="submit"
                            isLoading={updateProfile.isPending}
                            loadingLabel="Saving your profile"
                        >
                            Save changes
                        </Button>
                    </div>
                </form>

                <SocialLinksForm />
                <PreferencesForm />
            </div>
        </div>
    )
}
