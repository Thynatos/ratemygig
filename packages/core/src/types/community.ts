export interface Comment {
  id: string
  review_id: string
  user_id: string
  body: string
  created_at: string
  updated_at: string
}

export interface List {
  id: string
  user_id: string
  name: string
  description: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface ListItem {
  id: string
  list_id: string
  event_id: string
  notes: string | null
  position: number
  created_at: string
}
