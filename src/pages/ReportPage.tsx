import { useParams } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader.tsx'

export function ReportPage() {
  const { id } = useParams()

  return (
    <div className="room">
      <SiteHeader />
      <main className="page">
        <h1>Report</h1>
        <p>{id}</p>
      </main>
    </div>
  )
}
