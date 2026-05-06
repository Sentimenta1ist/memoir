import { useEffect } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import client from './api/client'
import { useAuthStore } from './store/authStore'
import ProtectedRoute from './components/ProtectedRoute'
import Toast from './components/Toast'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import WritePage from './pages/WritePage'
import ReadPage from './pages/ReadPage'

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <HomePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/write',
    element: (
      <ProtectedRoute>
        <WritePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/write/:id',
    element: (
      <ProtectedRoute>
        <WritePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/entry/:id',
    element: (
      <ProtectedRoute>
        <ReadPage />
      </ProtectedRoute>
    ),
  },
])

export default function App() {
  const { accessToken, setUser, clear } = useAuthStore()

  useEffect(() => {
    if (!accessToken) return
    client
      .get('/auth/me')
      .then((r) => setUser(r.data))
      .catch(() => clear())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <RouterProvider router={router} />
      <Toast />
    </>
  )
}
