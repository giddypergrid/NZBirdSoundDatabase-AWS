import React from 'react'
import { Frown } from 'lucide-react'

type Props = {
  className?: string
  message?: string
}

const ImageNotFound: React.FC<Props> = ({ className = '', message = 'No image available' }) => {
  return (
    <div className={`w-full h-full flex flex-col items-center justify-center bg-forest-700/50 ${className}`}>
      <Frown className="w-10 h-10 text-white/20 mb-2" strokeWidth={1.5} />
      <span className="text-xs text-white/25 font-medium">{message}</span>
    </div>
  )
}

export default ImageNotFound
