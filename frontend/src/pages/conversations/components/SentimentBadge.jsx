import { INTERACTION_TYPES } from '../data/summaryData'

// Renders the real `interaction_type` value returned by the backend
// (call / email / meeting / demo / other). Kept as its own component (same
// spot in the tree as the original mock "sentiment" badge) since the
// backend has no sentiment field to display.
function SentimentBadge({ type }) {
  const config = INTERACTION_TYPES[type] ?? INTERACTION_TYPES.other
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
