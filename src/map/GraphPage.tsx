import type { AppData } from '../lib/data'
import { MapWorkspace } from './MapWorkspace'

export function GraphPage({ data }: { data: AppData }) {
  return <MapWorkspace data={data} />
}
