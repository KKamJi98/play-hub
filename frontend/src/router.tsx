import { Suspense } from "react";
import { createBrowserRouter, useParams, Navigate } from "react-router";
import MainLayout from "./layouts/MainLayout";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import { getById } from "./games/registry";

function GameRouter() {
  const { gameId } = useParams<{ gameId: string }>();
  if (!gameId) return <Navigate to="/" replace />;

  const game = getById(gameId);
  if (!game) return <NotFoundPage />;

  const GameComponent = game.component;
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="font-display text-lg text-[#8892a4] animate-pulse">
            로딩 중...
          </div>
        </div>
      }
    >
      <GameComponent />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      {
        path: "/",
        element: <HomePage />,
      },
      {
        path: "/games/:gameId",
        element: <GameRouter />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);
