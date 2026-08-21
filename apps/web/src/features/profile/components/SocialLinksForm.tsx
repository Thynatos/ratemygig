import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { supabase } from '@/shared/lib/supabase'
import { useUpdateProfile } from '@/features/profile/api/profile'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { cn } from '@/shared/lib/utils'

export function SocialLinksForm() {
    const { user } = useAuth()
    const updateProfile = useUpdateProfile()
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
    const [dirty, setDirty] = useState(false)

    const [websiteUrl, setWebsiteUrl] = useState('')
    const [twitterHandle, setTwitterHandle] = useState('')
    const [instagramHandle, setInstagramHandle] = useState('')

    const { data: profile } = useQuery({
        queryKey: ['profiles', 'detail', user?.id, 'links'],
        queryFn: async () => {
            if (!user) return null
            const { data, error } = await supabase
                .from('profiles')
                .select('website_url, twitter_handle, instagram_handle')
                .eq('id', user.id)
                .single()

            if (error) throw error
            return data
        },
        enabled: !!user,
    })

    if (profile && !dirty) {
        const w = profile.website_url || ''
        const t = profile.twitter_handle ? `@${profile.twitter_handle}` : ''
        const i = profile.instagram_handle ? `@${profile.instagram_handle}` : ''
        if (w !== websiteUrl || t !== twitterHandle || i !== instagramHandle) {
            setWebsiteUrl(w)
            setTwitterHandle(t)
            setInstagramHandle(i)
        }
    }

    const handleSave = () => {
        if (!user) return
        setMessage(null)
        setDirty(false)

        updateProfile.mutate(
            {
                userId: user.id,
                website_url: websiteUrl || null,
                twitter_handle: twitterHandle || null,
                instagram_handle: instagramHandle || null,
            },
            {
                onSuccess: () => setMessage({ ok: true, text: 'Links saved.' }),
                onError: () =>
                    setMessage({
                        ok: false,
                        text: 'The links did not save. Your entries are still here.',
                    }),
            }
        )
    }

    const handleChange =
        (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
            setDirty(true)
            setter(e.target.value)
        }

    return (
        <section className="border border-rail bg-board">
            <h2 className="voice-label text-bone-dim px-4 py-2.5 border-b border-rail">
                Where else to find you
            </h2>

            <div className="p-4 space-y-5">
                <Input
                    label="Website"
                    name="website_url"
                    type="url"
                    placeholder="https://"
                    value={websiteUrl}
                    onChange={handleChange(setWebsiteUrl)}
                />

                <Input
                    label="X / Twitter"
                    name="twitter_handle"
                    placeholder="@handle"
                    value={twitterHandle}
                    onChange={handleChange(setTwitterHandle)}
                />

                <Input
                    label="Instagram"
                    name="instagram_handle"
                    placeholder="@handle"
                    value={instagramHandle}
                    onChange={handleChange(setInstagramHandle)}
                />

                {message && (
                    <p
                        role="status"
                        className={cn('text-ui-sm', message.ok ? 'text-bone-dim' : 'text-struck')}
                    >
                        {message.text}
                    </p>
                )}

                <div className="flex justify-end">
                    <Button
                        type="button"
                        onClick={handleSave}
                        isLoading={updateProfile.isPending}
                        loadingLabel="Saving your links"
                    >
                        Save links
                    </Button>
                </div>
            </div>
        </section>
    )
}
