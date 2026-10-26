export type PoolOption = {
  id: string
  label: string
  available: boolean
  unavailableReason: string | null
}

type PoolPickerProps = {
  phase: 'loading' | 'ready' | 'failed'
  pools: PoolOption[]
  error: string | null
  selectedId: string | null
  onSelect: (id: string) => void
}

export function PoolPicker({ phase, pools, error, selectedId, onSelect }: PoolPickerProps) {
  return (
    <fieldset className="pool-picker" aria-busy={phase === 'loading'}>
      <legend>Time control</legend>
      {phase === 'loading' ? <p className="field-status">Loading time controls.</p> : null}
      {phase === 'failed' ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      {phase === 'ready' ? (
        <div className="pool-list">
          {pools.map((pool) => {
            const labelId = `pool-label-${pool.id}`
            const reasonId = pool.unavailableReason ? `pool-reason-${pool.id}` : undefined
            return (
              <label
                key={pool.id}
                className={pool.available ? 'pool-option' : 'pool-option is-unavailable'}
              >
                <input
                  type="radio"
                  name="pool"
                  value={pool.id}
                  checked={selectedId === pool.id}
                  disabled={!pool.available}
                  aria-labelledby={labelId}
                  aria-describedby={reasonId}
                  onChange={() => onSelect(pool.id)}
                />
                <span className="pool-copy">
                  <span className="pool-label" id={labelId}>
                    {pool.label}
                  </span>
                  {pool.unavailableReason ? (
                    <span className="pool-reason" id={reasonId}>
                      {pool.unavailableReason}
                    </span>
                  ) : null}
                </span>
              </label>
            )
          })}
        </div>
      ) : null}
    </fieldset>
  )
}
