export interface Profile {
  id: string
  name: string
  photo_url: string | null
  instagram: string | null
  twitter_x: string | null
  tiktok: string | null
  facebook: string | null
  created_at: string
  updated_at: string
}

export interface Crush {
  id: string
  user_id: string
  name: string
  instagram: string | null
  twitter_x: string | null
  tiktok: string | null
  facebook: string | null
  photo_url: string | null
  interest_rating: number
  is_top: boolean
  review: string | null
  crush_number: number
  created_at: string
  updated_at: string
}

export interface CrushDate {
  id: string
  crush_id: string
  user_id: string
  location: string | null
  date_rating: number
  had_chat: boolean
  had_chat_rating: number
  had_kiss: boolean
  had_kiss_rating: number
  had_pirulito: boolean
  had_pirulito_rating: number
  had_donut: boolean
  had_donut_rating: number
  had_fire: boolean
  had_fire_rating: number
  had_sweat: boolean
  had_sweat_rating: number
  review: string | null
  date: string | null
  photos: string[] | null
  created_at: string
}

export interface SocialFields {
  instagram: string
  twitter_x: string
  tiktok: string
  facebook: string
}
