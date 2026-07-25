import { SENTIMENTS } from '../data/summaryData'

function SentimentBadge({ sentiment }) {
  const config = SENTIMENTS[sentiment] ?? SENTIMENTS.Neutral
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        config.color,
      ].join(' ')}
    >
      <span className={['size-1.5 rounded-full', config.dot].join(' ')} />
      {config.label}
    </span>
  )
}

export default SentimentBadge
