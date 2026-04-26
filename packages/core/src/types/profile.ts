export interface Profile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  is_profile_public: boolean
  website_url: string | null
  twitter_handle: string | null
  instagram_handle: string | null
  created_at: string
  updated_at: string
}
