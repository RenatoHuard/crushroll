export interface Profile {
  id: string;
  name: string;
  instagram: string | null;
  twitter_x: string | null;
  tiktok: string | null;
  facebook: string | null;
  created_at: string;
  updated_at: string;
}

export interface Crush {
  id: string;
  user_id: string;
  name: string;
  instagram: string | null;
  twitter_x: string | null;
  tiktok: string | null;
  facebook: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialFields {
  instagram: string;
  twitter_x: string;
  tiktok: string;
  facebook: string;
}
