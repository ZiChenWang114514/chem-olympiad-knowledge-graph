import type { ReactNode } from 'react'
import { renderChem, renderLatex, renderRichText } from '../lib/katexRender'
import type { ProblemStem, StemBlock } from '../types'

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
          <div className="stem-subpart-head">
            <div className="stem-subpart-label">{block.label}</div>
            {typeof block.score === 'number' ? <span className="stem-part-score">{block.score} 分</span> : null}
          </div>
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
          <img src={src} alt={block.alt} loading="lazy" style={block.displayWidth ? { width: `${block.displayWidth}%` } : undefined} />
          {block.label ? <div className="stem-figure-label">{block.label}</div> : null}
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
    case 'layout':
      return (
        <div className="stem-layout-scroll">
          <div
            className="stem-layout"
            style={{
              minWidth: block.minWidth ? `${block.minWidth}px` : undefined,
              gridTemplateColumns: block.columns.map(column => `${column.span}fr`).join(' '),
            }}
          >
            {block.columns.map((column, columnIndex) => (
              <div className="stem-layout-column" key={columnIndex}>
                {column.blocks.map((child, childIndex) => (
                  <BlockView key={childIndex} block={child} baseUrl={baseUrl} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )
    default:
      return null
  }
}

export function StemRenderer({ stem }: { stem: ProblemStem }) {
  const baseUrl = import.meta.env.BASE_URL
  return (
    <article
      className="stem-doc"
      data-testid="problem-stem"
    >
      <div className="stem-body">
        {stem.blocks.map((block, i) => (
          <BlockView key={`b-${i}`} block={block} baseUrl={baseUrl} />
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
          '本题尚未提供可公开阅读的结构化题干。'}
      </p>
    </div>
  )
}
