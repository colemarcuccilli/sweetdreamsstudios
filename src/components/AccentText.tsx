import React from 'react'

type AccentColor = 'red' | 'blue' | 'green'

interface AccentTextProps {
  color: AccentColor
  children: React.ReactNode
  className?: string
}

export default function AccentText({ color, children, className = '' }: AccentTextProps) {
  const colorClass =
    color === 'red'
      ? 'accent-red'
      : color === 'blue'
      ? 'accent-blue'
      : 'accent-green'
  return <span className={`${colorClass} ${className}`}>{children}</span>
} 