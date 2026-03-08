import { Link } from "react-router";
import { getAll } from "../games/registry";
import type { GameDefinition } from "../games/types";

const CATEGORY_LABELS: Record<GameDefinition["category"], string> = {
  board: "Board",
  physics: "Physics",
  party: "Party",
  random: "Random",
};

const CATEGORY_COLORS: Record<GameDefinition["category"], string> = {
  board: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  physics: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  party: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  random: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

function CategoryBadge({ category }: { category: GameDefinition["category"] }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${CATEGORY_COLORS[category]}`}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}

function MultiplayerBadge({
  multiplayer,
}: {
  multiplayer: GameDefinition["multiplayer"];
}) {
  if (multiplayer.type === "none") return null;

  const labels: Record<string, string> = {
    local: "Local",
    network: "Online",
    both: "Local/Online",
  };

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
      </svg>
      {labels[multiplayer.type]} {multiplayer.minPlayers}-
      {multiplayer.maxPlayers}P
    </span>
  );
}

function AIBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      AI
    </span>
  );
}

// ---- SVG Thumbnails --------------------------------------------------------

function GomokuThumbnail() {
  return (
    <svg viewBox="0 0 160 90" className="h-full w-full">
      {/* Wood background */}
      <rect width="160" height="90" fill="#c4944a" />
      <rect width="160" height="90" fill="url(#wood)" opacity="0.3" />
      <defs>
        <pattern id="wood" width="20" height="20" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="20" y2="0" stroke="#a07030" strokeWidth="0.5" opacity="0.5" />
          <line x1="0" y1="5" x2="20" y2="5" stroke="#a07030" strokeWidth="0.3" opacity="0.3" />
          <line x1="0" y1="10" x2="20" y2="10" stroke="#a07030" strokeWidth="0.5" opacity="0.5" />
          <line x1="0" y1="15" x2="20" y2="15" stroke="#a07030" strokeWidth="0.3" opacity="0.3" />
        </pattern>
      </defs>
      {/* Grid lines */}
      {[30, 50, 70, 90, 110, 130].map((x) => (
        <line key={`v${x}`} x1={x} y1="10" x2={x} y2="80" stroke="#8b6914" strokeWidth="0.7" opacity="0.6" />
      ))}
      {[10, 25, 40, 55, 70, 80].map((y) => (
        <line key={`h${y}`} x1="30" y1={y} x2="130" y2={y} stroke="#8b6914" strokeWidth="0.7" opacity="0.6" />
      ))}
      {/* Black stones - diagonal pattern */}
      <circle cx="50" cy="25" r="7" fill="#1a1a1a" />
      <circle cx="70" cy="40" r="7" fill="#1a1a1a" />
      <circle cx="90" cy="55" r="7" fill="#1a1a1a" />
      <circle cx="110" cy="70" r="7" fill="#1a1a1a" />
      {/* White stones */}
      <circle cx="70" cy="25" r="7" fill="#f0f0f0" stroke="#ccc" strokeWidth="0.5" />
      <circle cx="90" cy="40" r="7" fill="#f0f0f0" stroke="#ccc" strokeWidth="0.5" />
      <circle cx="50" cy="55" r="7" fill="#f0f0f0" stroke="#ccc" strokeWidth="0.5" />
      {/* Highlights */}
      <circle cx="48" cy="23" r="2" fill="white" opacity="0.3" />
      <circle cx="68" cy="23" r="2" fill="white" opacity="0.4" />
    </svg>
  );
}

function OthelloThumbnail() {
  return (
    <svg viewBox="0 0 160 90" className="h-full w-full">
      {/* Green board */}
      <rect width="160" height="90" fill="#1b7a3a" />
      {/* Grid */}
      {[35, 55, 75, 95, 115].map((x) => (
        <line key={`v${x}`} x1={x} y1="5" x2={x} y2="85" stroke="#146b2e" strokeWidth="1" />
      ))}
      {[5, 25, 45, 65, 85].map((y) => (
        <line key={`h${y}`} x1="35" y1={y} x2="115" y2={y} stroke="#146b2e" strokeWidth="1" />
      ))}
      {/* Discs - classic opening pattern */}
      <circle cx="65" cy="35" r="8" fill="#f0f0f0" />
      <circle cx="85" cy="55" r="8" fill="#f0f0f0" />
      <circle cx="85" cy="35" r="8" fill="#1a1a1a" />
      <circle cx="65" cy="55" r="8" fill="#1a1a1a" />
      {/* Flipping hint disc */}
      <circle cx="45" cy="35" r="8" fill="#1a1a1a" opacity="0.4" />
      <circle cx="65" cy="15" r="8" fill="#f0f0f0" opacity="0.4" />
      {/* Extra placed discs */}
      <circle cx="105" cy="35" r="8" fill="#f0f0f0" />
      <circle cx="45" cy="55" r="8" fill="#1a1a1a" />
      {/* Highlights */}
      <circle cx="63" cy="33" r="2.5" fill="white" opacity="0.35" />
      <circle cx="83" cy="53" r="2.5" fill="white" opacity="0.35" />
    </svg>
  );
}

function BilliardsThumbnail() {
  return (
    <svg viewBox="0 0 160 90" className="h-full w-full">
      {/* Rail */}
      <rect width="160" height="90" rx="4" fill="#5d3a1a" />
      <rect x="3" y="3" width="154" height="84" rx="2" fill="#3e2510" />
      <rect x="6" y="6" width="148" height="78" rx="1" fill="#5d3a1a" />
      {/* Felt */}
      <rect x="12" y="12" width="136" height="66" fill="#1b6e33" />
      {/* Balls */}
      <circle cx="50" cy="45" r="7" fill="#ffffff" />
      <circle cx="48" cy="43" r="2" fill="white" opacity="0.4" />
      <circle cx="90" cy="35" r="7" fill="#ffd700" />
      <circle cx="88" cy="33" r="2" fill="white" opacity="0.3" />
      <circle cx="110" cy="55" r="7" fill="#cc0000" />
      <circle cx="108" cy="53" r="2" fill="white" opacity="0.3" />
      <circle cx="120" cy="30" r="7" fill="#cc4400" />
      <circle cx="118" cy="28" r="2" fill="white" opacity="0.3" />
      {/* Center line */}
      <line x1="80" y1="12" x2="80" y2="78" stroke="rgba(255,255,255,0.08)" strokeWidth="0.7" strokeDasharray="4 4" />
      {/* Diamonds */}
      <circle cx="40" cy="9" r="1.5" fill="#d4af37" />
      <circle cx="80" cy="9" r="1.5" fill="#d4af37" />
      <circle cx="120" cy="9" r="1.5" fill="#d4af37" />
    </svg>
  );
}

function LadderThumbnail() {
  return (
    <svg viewBox="0 0 160 90" className="h-full w-full">
      <rect width="160" height="90" fill="#1e1e2e" />
      {/* Vertical lines */}
      <line x1="35" y1="10" x2="35" y2="72" stroke="#6c7086" strokeWidth="2" />
      <line x1="65" y1="10" x2="65" y2="72" stroke="#6c7086" strokeWidth="2" />
      <line x1="95" y1="10" x2="95" y2="72" stroke="#6c7086" strokeWidth="2" />
      <line x1="125" y1="10" x2="125" y2="72" stroke="#6c7086" strokeWidth="2" />
      {/* Horizontal rungs */}
      <line x1="35" y1="22" x2="65" y2="22" stroke="#89b4fa" strokeWidth="1.5" opacity="0.7" />
      <line x1="65" y1="35" x2="95" y2="35" stroke="#f9e2af" strokeWidth="1.5" opacity="0.7" />
      <line x1="95" y1="48" x2="125" y2="48" stroke="#a6e3a1" strokeWidth="1.5" opacity="0.7" />
      <line x1="35" y1="55" x2="65" y2="55" stroke="#f38ba8" strokeWidth="1.5" opacity="0.7" />
      <line x1="65" y1="18" x2="95" y2="18" stroke="#cba6f7" strokeWidth="1.5" opacity="0.7" />
      <line x1="95" y1="60" x2="125" y2="60" stroke="#89b4fa" strokeWidth="1.5" opacity="0.7" />
      {/* Bottom dots */}
      <circle cx="35" cy="80" r="5" fill="#f38ba8" />
      <circle cx="65" cy="80" r="5" fill="#89b4fa" />
      <circle cx="95" cy="80" r="5" fill="#a6e3a1" />
      <circle cx="125" cy="80" r="5" fill="#f9e2af" />
    </svg>
  );
}

function RandomPickerThumbnail() {
  return (
    <svg viewBox="0 0 160 90" className="h-full w-full">
      <rect width="160" height="90" fill="#1e1e2e" />
      {/* Wheel segments */}
      <g transform="translate(80, 45)">
        <circle r="35" fill="none" stroke="#313244" strokeWidth="1" />
        {[
          { color: "#f38ba8", start: 0 },
          { color: "#89b4fa", start: 60 },
          { color: "#a6e3a1", start: 120 },
          { color: "#f9e2af", start: 180 },
          { color: "#cba6f7", start: 240 },
          { color: "#fab387", start: 300 },
        ].map(({ color, start }) => {
          const startRad = (start * Math.PI) / 180;
          const endRad = ((start + 60) * Math.PI) / 180;
          const x1 = 35 * Math.cos(startRad);
          const y1 = 35 * Math.sin(startRad);
          const x2 = 35 * Math.cos(endRad);
          const y2 = 35 * Math.sin(endRad);
          return (
            <path
              key={start}
              d={`M0,0 L${x1},${y1} A35,35 0 0,1 ${x2},${y2} Z`}
              fill={color}
              opacity="0.75"
            />
          );
        })}
        <circle r="6" fill="#1e1e2e" />
        <circle r="4" fill="#45475a" />
      </g>
      {/* Arrow pointer */}
      <polygon points="120,45 130,40 130,50" fill="#f5e0dc" />
    </svg>
  );
}

const THUMBNAIL_MAP: Record<string, () => React.ReactNode> = {
  gomoku: GomokuThumbnail,
  othello: OthelloThumbnail,
  billiards: BilliardsThumbnail,
  ladder: LadderThumbnail,
  "random-picker": RandomPickerThumbnail,
};

function GameThumbnail({ gameId, fallbackChar }: { gameId: string; fallbackChar: string }) {
  const Thumb = THUMBNAIL_MAP[gameId];
  if (Thumb) return <Thumb />;
  return (
    <span className="font-display text-3xl font-bold text-white/20">
      {fallbackChar}
    </span>
  );
}

function GameCard({ game }: { game: GameDefinition }) {
  return (
    <Link
      to={`/games/${game.id}`}
      className="card-glow group relative flex flex-col overflow-hidden rounded-2xl
                 border border-white/10 bg-white/5 backdrop-blur-sm
                 [data-theme=light]_&:border-gray-200 [data-theme=light]_&:bg-white"
    >
      {/* Thumbnail area */}
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
        {game.thumbnail ? (
          <img
            src={game.thumbnail}
            alt={game.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <GameThumbnail gameId={game.id} fallbackChar={game.nameKo.charAt(0)} />
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e1a] via-transparent to-transparent opacity-60" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-lg font-semibold tracking-wide group-hover:text-[#00f0ff] transition-colors duration-300">
            {game.nameKo}
          </h3>
          <p className="mt-1 text-sm text-[#8892a4] line-clamp-2">
            {game.description}
          </p>
        </div>

        {/* Badges */}
        <div className="mt-auto flex flex-wrap gap-2">
          <CategoryBadge category={game.category} />
          <MultiplayerBadge multiplayer={game.multiplayer} />
          {game.hasAI && <AIBadge />}
        </div>
      </div>
    </Link>
  );
}

// Placeholder cards to show the design when no games are registered yet
const PLACEHOLDER_GAMES: GameDefinition[] = [
  {
    id: "placeholder-1",
    name: "Coming Soon",
    nameKo: "곧 출시",
    description: "새로운 게임이 준비 중입니다. 기대해 주세요!",
    thumbnail: "",
    category: "board",
    multiplayer: { type: "both", minPlayers: 2, maxPlayers: 4 },
    hasAI: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: null as any,
  },
  {
    id: "placeholder-2",
    name: "Coming Soon",
    nameKo: "곧 출시",
    description: "새로운 게임이 준비 중입니다. 기대해 주세요!",
    thumbnail: "",
    category: "physics",
    multiplayer: { type: "local", minPlayers: 1, maxPlayers: 2 },
    hasAI: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: null as any,
  },
  {
    id: "placeholder-3",
    name: "Coming Soon",
    nameKo: "곧 출시",
    description: "새로운 게임이 준비 중입니다. 기대해 주세요!",
    thumbnail: "",
    category: "party",
    multiplayer: { type: "network", minPlayers: 2, maxPlayers: 8 },
    hasAI: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: null as any,
  },
  {
    id: "placeholder-4",
    name: "Coming Soon",
    nameKo: "곧 출시",
    description: "새로운 게임이 준비 중입니다. 기대해 주세요!",
    thumbnail: "",
    category: "random",
    multiplayer: { type: "none", minPlayers: 1, maxPlayers: 1 },
    hasAI: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: null as any,
  },
];

export default function HomePage() {
  const registeredGames = getAll();
  const displayGames =
    registeredGames.length > 0 ? registeredGames : PLACEHOLDER_GAMES;

  return (
    <div className="gradient-mesh relative min-h-screen overflow-hidden">
      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="particle"
          style={{ top: "10%", left: "15%", width: "6px", height: "6px" }}
        />
        <div
          className="particle"
          style={{ top: "20%", right: "20%", width: "4px", height: "4px" }}
        />
        <div
          className="particle"
          style={{ top: "60%", left: "10%", width: "5px", height: "5px" }}
        />
        <div
          className="particle"
          style={{ top: "70%", right: "15%", width: "3px", height: "3px" }}
        />
        <div
          className="particle"
          style={{
            top: "40%",
            left: "50%",
            width: "4px",
            height: "4px",
            animationDelay: "-3s",
            animationDuration: "7s",
          }}
        />
        <div
          className="particle"
          style={{
            top: "85%",
            left: "35%",
            width: "5px",
            height: "5px",
            animationDelay: "-1s",
            animationDuration: "9s",
          }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-10 sm:pt-20 sm:pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          {/* Glowing accent line */}
          <div className="mx-auto mb-8 h-1 w-24 rounded-full bg-gradient-to-r from-[#00f0ff] to-[#0080ff] shadow-lg shadow-cyan-500/50" />

          <h1 className="font-display text-3xl font-black tracking-wider sm:text-5xl lg:text-6xl xl:text-7xl">
            <span className="bg-gradient-to-r from-[#00f0ff] via-white to-[#ffb800] bg-clip-text text-transparent">
              PLAY HUB
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-sm text-[#8892a4] sm:text-lg">
            친구들과 함께 즐기는 게임 아케이드.
            <br />
            보드 게임부터 물리 퍼즐까지, 다양한 게임을 한 곳에서.
          </p>

          {/* Stats row */}
          <div className="mx-auto mt-10 flex max-w-md items-center justify-center gap-8 sm:gap-12">
            <div className="text-center">
              <div className="font-display text-2xl font-bold text-[#00f0ff]">
                {registeredGames.length}
              </div>
              <div className="mt-1 text-xs uppercase tracking-widest text-[#8892a4]">
                Games
              </div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-center">
              <div className="font-display text-2xl font-bold text-[#ffb800]">
                4
              </div>
              <div className="mt-1 text-xs uppercase tracking-widest text-[#8892a4]">
                Categories
              </div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-center">
              <div className="font-display text-2xl font-bold text-emerald-400">
                Free
              </div>
              <div className="mt-1 text-xs uppercase tracking-widest text-[#8892a4]">
                Forever
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Game Grid */}
      <section className="relative px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Section header */}
          <div className="mb-8 flex items-center gap-4">
            <h2 className="font-display text-xl font-semibold tracking-wider">
              ALL GAMES
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>

          {/* Empty state hint */}
          {registeredGames.length === 0 && (
            <div className="mt-12 text-center">
              <p className="text-sm text-[#8892a4]/60">
                게임을 등록하려면{" "}
                <code className="rounded bg-white/10 px-2 py-1 font-mono text-xs text-[#00f0ff]">
                  src/games/registry.ts
                </code>{" "}
                에 GameDefinition을 추가하세요.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
