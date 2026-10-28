import type { MethodRow } from '../method/present.ts'

type MethodTableProps = {
  rows: MethodRow[]
  caption: string
}

export function MethodTable({ rows, caption }: MethodTableProps) {
  return (
    <figure className="method-proof">
      <div className="method-table-scroll" tabIndex={0} aria-label="Results by rating bin">
        <table>
          <thead>
            <tr>
              <th scope="col">Bin</th>
              <th scope="col" className="num">
                Players
              </th>
              <th scope="col" className="num">
                Typical miss
              </th>
              <th scope="col" className="num">
                Bias
              </th>
              <th scope="col" className="num">
                Coverage
              </th>
              <th scope="col" className="num">
                Band width
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.bin}>
                <th scope="row">{row.bin}</th>
                <td className="num">{row.players}</td>
                <td className="num">{row.miss}</td>
                <td className="num">{row.bias}</td>
                <td className="num">{row.coverage}</td>
                <td className="num">{row.width}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="method-source">{caption}</figcaption>
    </figure>
  )
}
