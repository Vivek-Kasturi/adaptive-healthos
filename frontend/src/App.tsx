import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Plans from './pages/Plans'
import Progress from './pages/Progress'
import Achievements from './pages/Achievements'
import Layout from './components/Layout'

function App() {
  const [userId, setUserId] = useState<string | null>(
    localStorage.getItem('healthos_user_id')
  )

  const handleOnboarded = (id: string) => {
    localStorage.setItem('healthos_user_id', id)
    setUserId(id)
  }

  if (!userId) {
    return <Onboarding onComplete={handleOnboarded} />
  }

  return (
    <Layout userId={userId}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard userId={userId} />} />
        <Route path="/chat" element={<Chat userId={userId} />} />
        <Route path="/plans" element={<Plans userId={userId} />} />
        <Route path="/progress" element={<Progress userId={userId} />} />
        <Route path="/achievements" element={<Achievements userId={userId} />} />
      </Routes>
    </Layout>
  )
}

export default App
