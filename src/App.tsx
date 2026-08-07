import { Route, Routes } from 'react-router-dom'
import type { AppData } from './lib/data'
import { GraphPage } from './map/GraphPage'
import { OverviewMap } from './map/OverviewMap'
import { About } from './pages/About'
import { ExamDetail } from './pages/ExamDetail'
import { Exams } from './pages/Exams'
import { Knowledge } from './pages/Knowledge'
import { NotFound } from './pages/NotFound'
import { Statistics } from './pages/Statistics'
import { Shell } from './shell/Shell'

export default function App({ data }: { data: AppData }) {
  return (
    <Shell data={data}>
      <Routes>
        <Route path="/" element={<OverviewMap data={data} />} />
        <Route path="/graph" element={<GraphPage data={data} />} />
        <Route path="/exams" element={<Exams data={data} />} />
        <Route path="/exams/:id" element={<ExamDetail data={data} />} />
        <Route path="/knowledge/:id" element={<Knowledge data={data} />} />
        <Route path="/statistics" element={<Statistics data={data} />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Shell>
  )
}
