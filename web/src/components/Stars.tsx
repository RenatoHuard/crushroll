interface StarsProps {
  value: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClass = {
  sm:  'text-xs',
  md:  'text-sm',
  lg:  'text-xl',
  xl:  'text-3xl',
}

export default function Stars({ value, size = 'md' }: StarsProps) {
  return (
    <span className={`text-yellow-400 ${sizeClass[size]} leading-none`}>
      {'★'.repeat(Math.max(0, value))}
      <span className="text-crush-border">{'☆'.repeat(Math.max(0, 5 - value))}</span>
    </span>
  )
}
