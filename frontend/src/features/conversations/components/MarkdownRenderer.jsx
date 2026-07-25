import { CodeBlock } from './CodeBlock'

export function MarkdownRenderer({ content }) {
  if (!content) return null

  const parts = []
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g

  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index)
    if (textBefore) {
      parts.push({ type: 'text', content: textBefore })
    }

    parts.push({
      type: 'code',
      language: match[1] || 'text',
      code: match[2].trim(),
    })

    lastIndex = match.index + match[0].length
  }

  const textAfter = content.substring(lastIndex)
  if (textAfter) {
    parts.push({ type: 'text', content: textAfter })
  }

  return (
    <div className="space-y-2 text-xs sm:text-sm text-ink-primary leading-relaxed">
      {parts.map((part, pIdx) => {
        if (part.type === 'code') {
          return <CodeBlock key={pIdx} language={part.language} code={part.code} />
        }

        const lines = part.content.split('\n')
        return (
          <div key={pIdx} className="space-y-2">
            {lines.map((line, lIdx) => {
              if (line.trim() === '---') {
                return <hr key={lIdx} className="my-3 border-line-default" />
              }

              if (line.startsWith('### ')) {
                return (
                  <h3 key={lIdx} className="text-sm sm:text-base font-bold text-ink-primary mt-3 mb-1">
                    {parseInlineMarkdown(line.replace('### ', ''))}
                  </h3>
                )
              }
              if (line.startsWith('## ')) {
                return (
                  <h2 key={lIdx} className="text-base sm:text-lg font-bold text-ink-primary mt-4 mb-2">
                    {parseInlineMarkdown(line.replace('## ', ''))}
                  </h2>
                )
              }

              if (line.startsWith('> ')) {
                return (
                  <blockquote
                    key={lIdx}
                    className="border-l-3 border-brand-500 bg-surface-muted/60 pl-3.5 py-1.5 my-1 text-ink-secondary italic rounded-r-control"
                  >
                    {parseInlineMarkdown(line.replace('> ', ''))}
                  </blockquote>
                )
              }

              if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
                const bulletText = line.trim().replace(/^[*|-]\s+/, '')
                return (
                  <div key={lIdx} className="flex items-start space-x-2 pl-2 my-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500 mt-2 shrink-0" />
                    <span>{parseInlineMarkdown(bulletText)}</span>
                  </div>
                )
              }

              if (!line.trim()) {
                return <div key={lIdx} className="h-1" />
              }

              return <p key={lIdx}>{parseInlineMarkdown(line)}</p>
            })}
          </div>
        )
      })}
    </div>
  )
}

function parseInlineMarkdown(text) {
  if (!text) return ''

  const regex = /(\*\*.*?\*\*|`.*?`)/g
  const chunks = text.split(regex)

  return chunks.map((chunk, i) => {
    if (chunk.startsWith('**') && chunk.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-ink-primary">
          {chunk.slice(2, -2)}
        </strong>
      )
    }
    if (chunk.startsWith('`') && chunk.endsWith('`')) {
      return (
        <code
          key={i}
          className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[11px] sm:text-xs text-brand-700 border border-line-default"
        >
          {chunk.slice(1, -1)}
        </code>
      )
    }
    return chunk
  })
}
