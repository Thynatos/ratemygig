import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Save, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { supabase } from '@/shared/lib/supabase'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Avatar } from '@/shared/components/ui/Avatar'
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
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            username: '',
            display_name: '',
            bio: '',
            is_profile_public: true,
        },
    })

    const isPublic = watch('is_profile_public')

    // Load profile
    useEffect(() => {
        async function loadProfile() {
            if (!user) return

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (data) {
                setValue('username', data.username || '')
                setValue('display_name', data.display_name || '')
                setValue('bio', data.bio || '')
                setValue('is_profile_public', data.is_profile_public)
            }

            setIsLoading(false)
        }

        loadProfile()
    }, [user, setValue])

    const onSubmit = async (data: ProfileFormData) => {
        if (!user) return

        setIsSaving(true)
        setMessage(null)

        const { error } = await supabase
            .from('profiles')
            .update({
                username: data.username || null,
                display_name: data.display_name || null,
                bio: data.bio || null,
                is_profile_public: data.is_profile_public,
            })
            .eq('id', user.id)

        if (error) {
            if (error.code === '23505') {
                setMessage({ type: 'error', text: 'This username is already taken' })
            } else {
                setMessage({ type: 'error', text: 'Failed to update profile' })
            }
        } else {
            setMessage({ type: 'success', text: 'Profile updated successfully!' })
        }

        setIsSaving(false)
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

            <Card>
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Avatar */}
                        <div className="flex items-center gap-6">
                            <Avatar
                                src={user?.user_metadata?.avatar_url}
                                name={user?.user_metadata?.full_name || user?.email}
                                size="xl"
                            />
                            <div>
                                <p className="text-white font-medium">{user?.email}</p>
                                <p className="text-sm text-surface-400">
                                    Connected via {user?.app_metadata?.provider || 'email'}
                                </p>
                            </div>
                        </div>

                        {/* Username */}
                        <Input
                            label="Username"
                            placeholder="your_username"
                            hint="Used for your public profile URL"
                            error={errors.username?.message}
                            {...register('username')}
                        />

                        {/* Display Name */}
                        <Input
                            label="Display Name"
                            placeholder="Your Name"
                            error={errors.display_name?.message}
                            {...register('display_name')}
                        />

                        {/* Bio */}
                        <Textarea
                            label="Bio"
                            placeholder="Tell us about yourself..."
                            error={errors.bio?.message}
                            {...register('bio')}
                        />

                        {/* Privacy Toggle */}
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

                        {/* Message */}
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

                        {/* Submit */}
                        <div className="flex justify-end">
                            <Button type="submit" isLoading={isSaving}>
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
