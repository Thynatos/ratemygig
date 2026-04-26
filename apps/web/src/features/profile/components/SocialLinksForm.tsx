import { useState } from 'react'
import { Globe, Save } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { supabase } from '@/shared/lib/supabase'
import { useUpdateProfile } from '@/features/profile/api/profile'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { cn } from '@/shared/lib/utils'

export function SocialLinksForm() {
    const { user } = useAuth()
    const updateProfile = useUpdateProfile()
    const [message, setMessage] = useState<string | null>(null)
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
                onSuccess: () => setMessage('Social links saved!'),
                onError: () => setMessage('Failed to save social links'),
            }
        )
    }

    const handleChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setDirty(true)
        setter(e.target.value)
    }

    return (
        <Card>
            <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary-400" />
                    Social Links
                </h3>

                <div className="space-y-4">
                    <Input
                        label="Website"
                        placeholder="https://yourwebsite.com"
                        value={websiteUrl}
                        onChange={handleChange(setWebsiteUrl)}
                    />

                    <Input
                        label="Twitter / X"
                        placeholder="@handle"
                        value={twitterHandle}
                        onChange={handleChange(setTwitterHandle)}
                    />

                    <Input
                        label="Instagram"
                        placeholder="@handle"
                        value={instagramHandle}
                        onChange={handleChange(setInstagramHandle)}
                    />

                    {message && (
                        <p className={cn(
                            'text-sm',
                            message.includes('Failed') ? 'text-red-400' : 'text-green-400'
                        )}>
                            {message}
                        </p>
                    )}

                    <div className="flex justify-end">
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSave}
                            isLoading={updateProfile.isPending}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save Links
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
