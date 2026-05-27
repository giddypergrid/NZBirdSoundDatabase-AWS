import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const DefaultHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const btnClass = 'text-sm text-white/60 hover:text-white transition-colors cursor-pointer';
  const activeBtnClass = 'text-sm text-white font-medium cursor-pointer';

  const scrollToSection = (sectionId: string) => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-forest-800/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center group">
            <img src="/site-logo.png" alt="NZ Bird Sound logo" className="h-16 w-16 rounded-full object-cover mr-2" />
            <span className="text-lg font-serif italic text-white tracking-wide">
              NZ Bird Database
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollToSection('search-section')} className={btnClass}>Search birds</button>
            <button onClick={() => scrollToSection('database-section')} className={btnClass}>Bird database</button>
            <Link to="/match" className={location.pathname === '/match' ? activeBtnClass : btnClass}>Audio capture</Link>
          </nav>
        </div>
      </div>
    </header>
  )
}

export default DefaultHeader