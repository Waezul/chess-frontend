import { Route, Routes } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage.tsx'
import { MethodPage } from './pages/MethodPage.tsx'
import { ReplayPage } from './pages/ReplayPage.tsx'
import { ReportPage } from './pages/ReportPage.tsx'
import { UploadProvider } from './upload/UploadProvider.tsx'

export default function App() {
  return (
    <UploadProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/replay" element={<ReplayPage />} />
        <Route path="/method" element={<MethodPage />} />
        <Route path="/report/:id" element={<ReportPage />} />
      </Routes>
    </UploadProvider>
  )
}
