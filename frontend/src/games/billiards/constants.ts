/** Internal coordinate system: 1000x500 logical units (2:1 carom table ratio) */
export const TABLE_WIDTH = 1000;
export const TABLE_HEIGHT = 500;

export const BALL_RADIUS = 15;

/** Friction coefficient applied per physics sub-step */
export const FRICTION = 0.995;

/** Cushion (wall) restitution – energy kept on bounce */
export const CUSHION_RESTITUTION = 0.85;

/** Ball-ball collision restitution */
export const BALL_RESTITUTION = 0.95;

/** Maximum shot power (velocity magnitude) */
export const MAX_POWER = 15;

/** Physics sub-steps per frame for stability */
export const SUB_STEPS = 4;

/** Velocity threshold below which a ball is considered stopped */
export const STOP_THRESHOLD = 0.1;

/** Border (cushion) visual thickness in internal units */
export const CUSHION_WIDTH = 30;

/** Ball colours */
export const BALL_COLORS = {
  white: "#f5f5f5",
  yellow: "#f5c842",
  red1: "#d32f2f",
  red2: "#c62828",
} as const;

export type BallId = "white" | "yellow" | "red1" | "red2";

/** Target score options */
export const TARGET_SCORE_OPTIONS = [5, 10, 15, 20] as const;

export const DEFAULT_TARGET_SCORE = 10;

/** Spin constants */
export const SPIN_TRANSFER_RATE = 0.015;
export const SPIN_FRICTION = 0.98;
export const MAX_SPIN = 1;
