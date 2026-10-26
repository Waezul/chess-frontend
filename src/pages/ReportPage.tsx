import { useParams } from 'react-router-dom'

export function ReportPage() {
  const { id } = useParams()

  return (
    <main>
      <h1>Report</h1>
      <p>{id}</p>
    </main>
  )
}
