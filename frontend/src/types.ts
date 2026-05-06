export interface ImageResponse {
  id: string
  filename: string
  url: string
  position: number
  created_at: string
}

export interface EntryResponse {
  id: string
  user_id: string
  date: string
  day_text: string | null
  thought_text: string | null
  tomorrow_text: string | null
  created_at: string
  updated_at: string
  images: ImageResponse[]
}

export interface EntryListResponse {
  items: EntryResponse[]
  total: number
  streak: number
}
