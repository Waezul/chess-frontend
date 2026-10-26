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
            <h1>Bring eight rated games.</h1>
            <p>You get a range, not a single rating.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
