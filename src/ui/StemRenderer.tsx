import type { CSSProperties, ReactNode } from 'react'
import { renderChem, renderLatex, renderRichText } from '../lib/katexRender'
import { isDemoStem } from '../lib/stem'
import type { ProblemStem, StemBlock, StemPart } from '../types'

function Html({ html, className }: { html: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

function BlockView({ block, baseUrl }: { block: StemBlock; baseUrl: string }): ReactNode {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className="stem-p">
          <Html html={renderRichText(block.text)} />
        </p>
      )
    case 'formula':
      return (
        <div className={`stem-formula${block.display === false ? ' is-inline' : ''}`}>
          <Html html={renderLatex(block.latex, block.display !== false)} />
        </div>
      )
    case 'chem':
      return (
        <div className={`stem-chem${block.display === false ? ' is-inline' : ''}`}>
          <Html html={renderChem(block.latex, block.display !== false)} />
        </div>
      )
    case 'heading': {
      const Tag = (`h${block.level}` as 'h2' | 'h3' | 'h4')
      return <Tag className="stem-h">{block.text}</Tag>
    }
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul'
      return (
        <Tag className="stem-list">
          {block.items.map((item, i) => (
            <li key={i}>
              <Html html={renderRichText(item)} />
            </li>
          ))}
        </Tag>
      )
    }
    case 'subpart':
      return (
        <div className="stem-subpart">
          <div className="stem-subpart-label">{block.label}</div>
          {block.prompt ? (
            <p className="stem-p">
              <Html html={renderRichText(block.prompt)} />
            </p>
          ) : null}
          {block.blocks.map((child, i) => (
            <BlockView key={i} block={child} baseUrl={baseUrl} />
          ))}
        </div>
      )
    case 'figure': {
      const src = block.src ? `${baseUrl}${block.src.replace(/^\//, '')}` : ''
      if (!src) return null
      return (
        <figure className="stem-figure">
          <img src={src} alt={block.alt} loading="lazy" />
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      )
    }
    case 'table':
      return (
        <div className="stem-table-wrap">
          {block.caption ? <div className="stem-table-caption">{block.caption}</div> : null}
          <table className="stem-table">
            <thead>
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i}>
                    <Html html={renderRichText(h)} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>
                      <Html html={renderRichText(cell)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'callout':
      return (
        <div className={`stem-callout tone-${block.tone || 'info'}`}>
          <Html html={renderRichText(block.text)} />
        </div>
      )
    default:
      return null
  }
}

function PartView({ part, baseUrl }: { part: StemPart; baseUrl: string }) {
  return (
    <section className="stem-part">
      <header className="stem-part-head">
        <span className="stem-part-label">{part.label}</span>
        {typeof part.score === 'number' ? <span className="stem-part-score">{part.score} 分</span> : null}
      </header>
      <div className="stem-part-body">
        {part.blocks.map((block, i) => (
          <BlockView key={i} block={block} baseUrl={baseUrl} />
        ))}
      </div>
    </section>
  )
}

export function StemRenderer({ stem }: { stem: ProblemStem }) {
  const baseUrl = import.meta.env.BASE_URL
  const demo = isDemoStem(stem)

  return (
    <article
      className={`stem-doc${demo ? ' is-demo' : ''}`}
      data-testid="problem-stem"
      style={{ '--stem-accent': demo ? '#bc8a2f' : 'var(--teal)' } as CSSProperties}
    >
      <header className="stem-doc-head">
        <div className="stem-doc-kicker">
          <span>题目</span>
          {demo ? <span className="stem-badge demo">演示排版</span> : null}
        </div>
        <h2 className="stem-doc-title">
          {stem.number} · {stem.title}
        </h2>
        <p className="stem-doc-meta">
          {stem.examYear ? `${stem.examYear} · ` : ''}
          来源 {stem.source.sourceLabel}
          {stem.source.page != null ? ` · 页 ${stem.source.page}` : ''}
        </p>
        {stem.provenanceNote ? <p className="stem-provenance">{stem.provenanceNote}</p> : null}
      </header>

      <div className="stem-body">
        {(stem.blocks || []).map((block, i) => (
          <BlockView key={`b-${i}`} block={block} baseUrl={baseUrl} />
        ))}
        {(stem.parts || []).map(part => (
          <PartView key={part.id} part={part} baseUrl={baseUrl} />
        ))}
      </div>
    </article>
  )
}

export function StemLoading() {
  return (
    <div className="stem-loading" data-testid="stem-loading">
      <span className="spinner" aria-hidden="true" />
      <span>正在载入题干…</span>
    </div>
  )
}

export function StemUnavailable({ reason }: { reason?: string }) {
  return (
    <div className="stem-unavailable" data-testid="stem-unavailable">
      <b>题文暂不公开</b>
      <p>
        {reason ||
          '本题尚未提供结构化题干文件。公开站仅在来源许可时加载题干内容；答案与评分永不发布。'}
      </p>
    </div>
  )
}
