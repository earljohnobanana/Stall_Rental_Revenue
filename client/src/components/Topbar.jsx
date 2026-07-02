import { MdCalendarToday, MdMenu } from 'react-icons/md';

export default function Topbar({ title, onMenuClick }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const shortDate = now.toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  return (
    <header className="h-14 bg-white border-b border-gov-border flex items-center justify-between px-4 shadow-sm flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded text-gov-navy hover:bg-gov-cream transition-colors"
          aria-label="Open menu"
        >
          <MdMenu size={22} />
        </button>
        <h1 className="font-serif text-base md:text-xl text-gov-navy font-bold truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2 text-gov-gray text-xs md:text-sm font-sans">
        <MdCalendarToday className="text-gov-blue flex-shrink-0" />
        {/* Short date on mobile, full date on desktop */}
        <span className="hidden sm:inline">{dateStr}</span>
        <span className="sm:hidden">{shortDate}</span>
      </div>
    </header>
  );
}