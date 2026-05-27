import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bird } from 'types/bird'
import { useBirdImage } from 'hooks/useQueries'
import ImageNotFound from 'components/ImageNotFound'
import AIBorder from 'components/AIBorder'

type FloatingImageProps = {
  bird: Bird
  className: string
}

const FloatingImage: React.FC<FloatingImageProps> = ({ bird, className }) => {
  const { data: imgUrl, isError } = useBirdImage(bird)
  const [imgFailed, setImgFailed] = useState(false)
  const showFallback = isError || imgFailed || !imgUrl

  return (
    <div className={`absolute rounded-2xl overflow-hidden shadow-2xl shadow-black/30 ${className}`}>
      {showFallback ? (
        <ImageNotFound />
      ) : (
        <img
          src={imgUrl}
          alt={bird.common_name}
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      )}
    </div>
  )
}

type Props = {
  birds: Bird[]
}

const HeroSection: React.FC<Props> = ({ birds }) => {
  const displayBirds = birds.slice(0, 6)

  const scrollToSearch = () => {
    document.getElementById('search-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative w-full min-h-[85vh] flex items-center justify-center overflow-hidden bg-forest-800">
      {/* Floating bird images */}
      {displayBirds.length > 0 && (
        <>
          <FloatingImage bird={displayBirds[0]} className="w-48 h-36 top-8 left-8 -rotate-6 opacity-60" />
          <FloatingImage bird={displayBirds[1] || displayBirds[0]} className="w-56 h-44 top-12 right-16 rotate-3 opacity-50" />
          <FloatingImage bird={displayBirds[2] || displayBirds[0]} className="w-40 h-52 top-1/3 right-4 rotate-6 opacity-40" />
          <FloatingImage bird={displayBirds[3] || displayBirds[0]} className="w-44 h-32 bottom-32 left-4 rotate-3 opacity-50" />
          <FloatingImage bird={displayBirds[4] || displayBirds[0]} className="w-52 h-40 bottom-16 right-24 -rotate-3 opacity-40" />
          {displayBirds[5] && (
            <FloatingImage bird={displayBirds[5]} className="w-36 h-48 top-1/4 left-1/4 rotate-12 opacity-30" />
          )}
        </>
      )}

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-forest-800/40 via-forest-800/80 to-forest-800" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-3xl mx-auto px-6">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight">
          Listen to every bird in New Zealand
        </h1>
        <p className="mt-6 text-lg text-white/60 max-w-xl mx-auto leading-relaxed">
          Identify birds by their calls. Search our database or upload a sound to discover what's singing in your backyard.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <button onClick={scrollToSearch} className="px-6 py-3 bg-white text-forest-900 font-semibold rounded-lg hover:bg-white/90 transition-colors text-sm">
            Search
          </button>
          <AIBorder showBadge={true}>
            <Link to="/match" className="block px-6 py-3 bg-transparent border border-white/30 hover:border-white/60 text-white font-medium rounded-lg transition-colors text-sm">
              Match sound
            </Link>
          </AIBorder>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
