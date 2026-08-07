import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({ base: '/chem-olympiad-knowledge-graph/', plugins: [react()] })
