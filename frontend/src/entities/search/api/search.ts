import { api } from '../../../shared/api'
import type { SearchParams, SearchResponse } from '../model/types'

export async function searchGlobal(params: SearchParams): Promise<SearchResponse> {
  const response = await api.get<SearchResponse>('/search', { params })
  return response.data
}
