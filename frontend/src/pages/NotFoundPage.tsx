import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <div className="gradient-mesh flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
      {/* Glitch-style 404 */}
      <h1 className="font-display text-8xl font-black tracking-widest sm:text-9xl">
        <span className="bg-gradient-to-r from-[#00f0ff] to-[#ffb800] bg-clip-text text-transparent">
          404
        </span>
      </h1>

      <p className="mt-6 text-xl text-[#8892a4]">
        페이지를 찾을 수 없습니다.
      </p>

      <p className="mt-2 text-sm text-[#8892a4]/60">
        찾으시는 게임이 아직 등록되지 않았거나, 주소가 잘못되었을 수 있습니다.
      </p>

      <Link
        to="/"
        className="mt-10 inline-flex items-center gap-2 rounded-xl
                   bg-gradient-to-r from-[#00f0ff] to-[#0080ff]
                   px-6 py-3 font-display text-sm font-semibold tracking-wider
                   text-[#0a0e1a] shadow-lg shadow-cyan-500/25
                   transition-all duration-300
                   hover:shadow-cyan-500/50 hover:scale-105
                   active:scale-95"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        HOME
      </Link>
    </div>
  );
}
