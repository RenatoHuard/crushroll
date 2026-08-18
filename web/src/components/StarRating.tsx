interface StarRatingProps {
  value: number
  onChange: (v: number) => void
  size?: 'sm' | 'md' | 'lg'
}

const sizeClass = { sm: 'text-xl', md: 'text-3xl', lg: 'text-4xl' }

export default function StarRating({ value, onChange, size = 'md' }: StarRatingProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star === value ? 0 : star)}
          className={`${sizeClass[size]} leading-none transition-colors hover:scale-110`}
          style={{ color: star <= value ? '#FFD700' : '#3A3F45' }}
        >
          {star <= value ? '★' : '☆'}
        </button>
      ))}
    </div>
  )
}
