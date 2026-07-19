import { RouterProvider } from "react-router-dom"
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query"
import { router } from "./router"
import { ToastContainer, toast } from "../shared/ui"
import { ApiError, CustomQueryMeta } from "../shared/api"

const handleGlobalError = (error: unknown, meta?: Record<string, unknown>) => {
  const customMeta = meta as CustomQueryMeta | undefined
  if (customMeta?.suppressGlobalError) {
    return
  }

  if (error instanceof ApiError) {
    toast.error(error.detail || error.message, error.title || "请求失败")
  } else if (error instanceof Error) {
    toast.error(error.message, "操作异常")
  } else {
    toast.error("发生未预期的错误，请稍后再试", "请求错误")
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      handleGlobalError(error, query.meta)
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      handleGlobalError(error, mutation.meta)
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        // 4xx 状态码不自动重试
        if (error instanceof ApiError && error.status && error.status >= 400 && error.status < 500) {
          return false
        }
        return failureCount < 1
      },
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ToastContainer />
    </QueryClientProvider>
  )
}

