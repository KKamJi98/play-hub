import { Link } from "react-router";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-md
                    border-white/10 bg-[#0a0e1a]/80
                    [data-theme=light]_&:border-gray-200 [data-theme=light]_&:bg-white/80"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center
                          font-display font-bold text-sm
                          bg-gradient-to-br from-[#00f0ff] to-[#0080ff]
                          text-[#0a0e1a] shadow-lg shadow-cyan-500/25
                          group-hover:shadow-cyan-500/50 transition-shadow duration-300"
            >
              PH
            </div>
            <span className="font-display font-semibold text-lg tracking-wider hidden sm:block">
              PLAY HUB
            </span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-2">
            <Link
              to="/"
              className="px-3 py-2 text-sm font-medium rounded-lg
                         transition-colors duration-200
                         hover:bg-white/10 hover:text-[#00f0ff]"
            >
              Games
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}
