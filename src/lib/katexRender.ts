import katex from 'katex'
// mhchem registers \ce with KaTeX
import 'katex/dist/contrib/mhchem.mjs'

const KATEX_OPTS: katex.KatexOptions = {
  throwOnError: false,
  strict: 'ignore',
  trust: true,
  output: 'html',
}

/** Render a pure LaTeX math string */
export function renderLatex(latex: string, display = false): string {
  const normalized = latex.replace(/\\\\(?=[A-Za-z])/g, '\\')
  return katex.renderToString(normalized, { ...KATEX_OPTS, displayMode: display })
}

/** Render mhchem expression (wraps with \ce if needed) */
export function renderChem(expr: string, display = false): string {
  const trimmed = expr.trim()
  const latex = trimmed.startsWith('\\ce{') ? trimmed : `\\ce{${trimmed}}`
  return renderLatex(latex, display)
}

/**
 * Render text that may contain $...$ or $$...$$ math islands.
 * Returns safe HTML string (only KaTeX spans + escaped text).
 */
export function renderRichText(text: string): string {
  if (!text) return ''
  const parts: string[] = []
  // $$ display $$ then $ inline $
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    if (match.index > last) {
      parts.push(renderBareLatex(text.slice(last, match.index)))
    }
    if (match[1] != null) {
      parts.push(renderLatex(match[1], true))
    } else if (match[2] != null) {
      parts.push(renderLatex(match[2], false))
    }
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(renderBareLatex(text.slice(last)))
  return parts.join('')
}

function renderBareLatex(value: string): string {
  const parts: string[] = []
  const re = /(?:[A-Za-z]\s*=\s*[-+]?\d+(?:\.\d+)?\\,\\mathrm\{[^{}]+\}|\\(?:mathbf|mathrm|mathit|ce)\{[^{}]+\})/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(value))) {
    if (match.index > last) parts.push(escapeHtml(value.slice(last, match.index)))
    parts.push(renderLatex(match[0], false))
    last = match.index + match[0].length
  }
  if (last < value.length) parts.push(escapeHtml(value.slice(last)))
  return parts.join('')
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
