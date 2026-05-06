import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const imgUrl = (path: string): string =>
  path.startsWith('http') ? path : BASE_URL + path

const client = axios.create({ baseURL: BASE_URL })

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const orig = err.config as typeof err.config & { _retry?: boolean }
    if (err.response?.status !== 401 || orig._retry) {
      return Promise.reject(err)
    }

    const store = useAuthStore.getState()
    if (!store.refreshToken) {
      store.clear()
      window.location.href = '/login'
      return Promise.reject(err)
    }

    if (isRefreshing) {
      return new Promise<string>((resolve) => {
        refreshQueue.push(resolve)
      }).then((token) => {
        orig.headers['Authorization'] = `Bearer ${token}`
        return client(orig)
      })
    }

    orig._retry = true
    isRefreshing = true

    try {
      const res = await axios.post(`${BASE_URL}/auth/refresh`, {
        refresh_token: store.refreshToken,
      })
      const { access_token, refresh_token } = res.data
      store.setTokens(access_token, refresh_token)
      refreshQueue.forEach((cb) => cb(access_token))
      refreshQueue = []
      orig.headers['Authorization'] = `Bearer ${access_token}`
      return client(orig)
    } catch {
      store.clear()
      window.location.href = '/login'
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  }
)

export default client
