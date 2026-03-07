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
            <span className="font-display text-3xl font-bold text-white/20">
              {game.nameKo.charAt(0)}
            </span>
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
      <section className="relative px-4 pt-20 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          {/* Glowing accent line */}
          <div className="mx-auto mb-8 h-1 w-24 rounded-full bg-gradient-to-r from-[#00f0ff] to-[#0080ff] shadow-lg shadow-cyan-500/50" />

          <h1 className="font-display text-5xl font-black tracking-wider sm:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-r from-[#00f0ff] via-white to-[#ffb800] bg-clip-text text-transparent">
              PLAY HUB
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-[#8892a4] sm:text-xl">
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
