import { http, HttpResponse, delay } from 'msw'
import { searchMockData } from './data'

export const searchHandlers = [
  http.get('/api/search', async ({ request }) => {
    const url = new URL(request.url)
    const q = url.searchParams.get('q') || ''
    const category = url.searchParams.get('category') || 'all'
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : 10

    await delay(180)

    const results = searchMockData(q, category, limit)

    return HttpResponse.json({
      query: q,
      total: results.length,
      results,
    })
  }),
]
