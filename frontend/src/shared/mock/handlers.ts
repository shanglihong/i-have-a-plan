import { http, HttpResponse, delay } from 'msw'
import { MOCK_PROJECTS_DATA as MOCK_PROJECTS } from '../../mock/modules/projects/data'
import { MOCK_NOTES_DATA as MOCK_NOTES } from '../../mock/modules/notes/data'

export const handlers = [
  http.get('/api/projects', async ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')

    let filtered = MOCK_PROJECTS
    if (status && status !== 'ALL') {
      filtered = filtered.filter((p: any) => p.status === status)
    }

    await delay(300)
    return HttpResponse.json({
      items: filtered,
      total: filtered.length,
      page: 1,
      size: 20,
      has_next: false
    })
  }),

  http.get('/api/projects/:id', async ({ params }) => {
    const { id } = params
    const project = MOCK_PROJECTS.find((p: any) => p.id === id)
    await delay(300)
    if (!project) {
      return HttpResponse.json({
        type: 'https://api.example.com/errors/not-found',
        title: 'Project Not Found',
        status: 404,
      }, { status: 404 })
    }
    return HttpResponse.json(project)
  }),

  http.get('/api/projects/:id/notes', async () => {
    await delay(300)
    return HttpResponse.json({
      items: MOCK_NOTES,
      next_cursor: null,
      has_next: false
    })
  }),

  http.get('/api/projects/:id/tasks', async () => {
    await delay(300)
    return HttpResponse.json(MOCK_TASKS)
  }),

  http.post('/api/tasks/reschedule', async () => {
    await delay(500)
    return HttpResponse.json({
      rescheduled_count: 5,
      affected_tasks: []
    })
  }),

  http.get('/api/graph/all', async () => {
    await delay(300)
    return HttpResponse.json({
      nodes: MOCK_GRAPH_NODES,
      edges: MOCK_GRAPH_EDGES
    })
  }),

  http.post('/api/discuss', async () => {
    await delay(500)
    return HttpResponse.json({
      text: "这是一个很好的问题。**反向传播算法**的核心是利用链式求导法则，将输出层的误差信号逐层传递回输入层。关键在于：每一层的梯度都是当前层局部梯度与后续层梯度的乘积。当激活函数（如 Sigmoid）的导数区间在 (0, 0.25) 时，多层连乘后梯度会指数级缩小，这就是**梯度消失**的根源。",
      is_done: true,
      task_recommendation: { title: "深入学习激活函数" }
    })
  }),

  http.post('/api/notes', async ({ request }) => {
    const data = await request.json() as Record<string, any>;
    await delay(400)
    return HttpResponse.json({
      id: "n_new_" + Date.now(),
      status: "CREATED",
      ...data
    }, { status: 201 })
  }),

  http.post('/api/skills/:id/approve', async ({ request, params }) => {
    const { id } = params
    const data = await request.json() as Record<string, any>;
    await delay(600)
    if (data?.cyclePath?.length > 0) {
      return HttpResponse.json({
        type: "https://api.example.com/errors/topology-cycle",
        title: "Topological Cycle Detected",
        status: 400,
        detail: "依赖解析失败，检测到步骤循环依赖。",
        instance: `/api/skills/${id}/approve`,
        extension_fields: {
          cycle_path: data.cyclePath
        }
      }, { status: 400 })
    }

    return HttpResponse.json({ status: "ACTIVE" })
  }),
]
