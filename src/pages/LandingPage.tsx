import { QueenPortrait } from '../board/QueenPortrait.tsx'
import { SiteHeader } from '../components/SiteHeader.tsx'

export function LandingPage() {
  return (
    <div className="room">
      <SiteHeader />
      <main className="portrait">
        <div className="portrait-canvas" aria-hidden="true">
          <QueenPortrait />
        </div>
        <div className="portrait-scrim">
          <div className="portrait-copy">
            <h1>Show eight rated games.</h1>
            <p>The result is a 10–90% band, not a single rating.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
