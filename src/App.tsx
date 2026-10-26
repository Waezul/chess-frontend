import { Route, Routes } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage.tsx'
import { MethodPage } from './pages/MethodPage.tsx'
import { ReportPage } from './pages/ReportPage.tsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/method" element={<MethodPage />} />
      <Route path="/report/:id" element={<ReportPage />} />
    </Routes>
  )
}
