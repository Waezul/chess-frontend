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
            <h1>Get your Elo guessed.</h1>
            <p>
              Our model will guess your Elo. The 10–90% band is the low and high of that guess, not how
              sure the model is.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
