export type SearchCategory = 'all' | 'project' | 'note' | 'graph' | 'skill'

export interface SearchResultItem {
  id: string
  type: 'project' | 'note' | 'graph' | 'skill'
  title: string
  snippet: string
  target_url: string
  updated_at: string
}

export interface SearchParams {
  q: string
  category?: SearchCategory
  limit?: number
}

export interface SearchResponse {
  query: string
  total: number
  results: SearchResultItem[]
}
