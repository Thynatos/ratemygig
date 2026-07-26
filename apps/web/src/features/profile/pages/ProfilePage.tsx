import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Save, Eye, EyeOff } from 'lucide-react'
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
import { Card, CardContent } from '@/shared/components/ui/Card'
import { LoadingPage } from '@/shared/components/ui/Loading'
import { cn } from '@/shared/lib/utils'

const profileSchema = z.object({
    username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username must be at most 30 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
        .optional()
        .or(z.literal('')),
    display_name: z.string().max(100).optional(),
    bio: z.string().max(500).optional(),
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

    const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<ProfileFormData>({
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

    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
                onSuccess: () => setMessage({ type: 'success', text: 'Profile updated successfully!' }),
                onError: (err) => {
                    if ((err as { code?: string }).code === '23505') {
                        setMessage({ type: 'error', text: 'This username is already taken' })
                    } else {
                        setMessage({ type: 'error', text: 'Failed to update profile' })
                    }
                },
            }
        )
    }

    if (isLoading) return <LoadingPage message="Loading profile..." />

    return (
        <div className="page-container max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="section-title flex items-center gap-3">
                    <User className="w-8 h-8 text-primary-400" />
                    Profile Settings
                </h1>
                <p className="section-subtitle">Manage your public profile</p>
            </div>

            <Card className="mb-6">
                <CardContent className="p-6">
                    <AvatarUpload
                        currentAvatarUrl={profile?.avatar_url || null}
                        userId={user?.id || ''}
                    />
                    {user && (
                        <div className="text-center mt-4">
                            <p className="text-white font-medium">{user.email}</p>
                            <p className="text-sm text-surface-400">
                                Connected via {user.app_metadata?.provider || 'email'}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {user && (
                <div className="mb-6">
                    <GigStatsCard userId={user.id} />
                </div>
            )}

            <Card>
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <Input
                            label="Username"
                            placeholder="your_username"
                            hint="Used for your public profile URL"
                            error={errors.username?.message}
                            {...register('username')}
                        />

                        <Input
                            label="Display Name"
                            placeholder="Your Name"
                            error={errors.display_name?.message}
                            {...register('display_name')}
                        />

                        <Textarea
                            label="Bio"
                            placeholder="Tell us about yourself..."
                            error={errors.bio?.message}
                            {...register('bio')}
                        />

                        <div className="flex items-center justify-between p-4 rounded-xl bg-surface-800 border border-surface-700">
                            <div className="flex items-center gap-3">
                                {isPublic ? (
                                    <Eye className="w-5 h-5 text-green-400" />
                                ) : (
                                    <EyeOff className="w-5 h-5 text-surface-400" />
                                )}
                                <div>
                                    <p className="font-medium text-white">
                                        {isPublic ? 'Public Profile' : 'Private Profile'}
                                    </p>
                                    <p className="text-sm text-surface-400">
                                        {isPublic
                                            ? 'Your profile and public reviews are visible to everyone'
                                            : 'Your profile is hidden from other users'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setValue('is_profile_public', !isPublic)}
                                className={cn(
                                    'relative w-12 h-6 rounded-full transition-colors',
                                    isPublic ? 'bg-green-500' : 'bg-surface-600'
                                )}
                            >
                                <span
                                    className={cn(
                                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                                        isPublic ? 'translate-x-7' : 'translate-x-1'
                                    )}
                                />
                            </button>
                        </div>

                        {message && (
                            <div
                                className={cn(
                                    'p-4 rounded-xl',
                                    message.type === 'success'
                                        ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                                        : 'bg-red-500/10 border border-red-500/30 text-red-400'
                                )}
                            >
                                {message.text}
                            </div>
                        )}

                        <div className="flex justify-end">
                            <Button type="submit" isLoading={updateProfile.isPending}>
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="mt-6">
                <SocialLinksForm />
            </div>

            <div className="mt-6">
                <PreferencesForm />
            </div>
        </div>
    )
}
