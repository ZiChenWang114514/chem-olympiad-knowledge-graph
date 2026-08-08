import type { AppData } from '../lib/data'
import { MapWorkspace } from './MapWorkspace'

export function OverviewMap({ data }: { data: AppData }) {
  return <MapWorkspace data={data} />
}
