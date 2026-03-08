/** Internal coordinate system: 1000x500 logical units (2:1 carom table ratio) */
export const TABLE_WIDTH = 1000;
export const TABLE_HEIGHT = 500;

export const BALL_RADIUS = 15;

/** Border (cushion) visual thickness in internal units */
export const CUSHION_WIDTH = 30;

// ---- Real physics constants (SI) ------------------------------------------

/** Carom ball radius (m) */
export const R = 0.03075;

/** Carom ball mass (kg) */
export const M = 0.210;

/** Gravitational acceleration (m/s^2) */
export const g = 9.81;

/** Ball-cloth sliding friction coefficient */
export const MU_S = 0.2;

/** Ball-cloth rolling resistance coefficient */
export const MU_R = 0.015;

/** Ball-cloth spinning friction coefficient */
export const MU_SP = 0.044;

/** Ball-ball friction coefficient */
export const MU_BB = 0.06;

/** Ball-ball coefficient of restitution */
export const E_BB = 0.95;

/** Ball-cushion friction coefficient */
export const MU_C = 0.14;

/** Ball-cushion coefficient of restitution */
export const E_C = 0.85;

// ---- Coordinate conversion ------------------------------------------------

/** Pixels per meter — maps carom table internal width (1.42m) to TABLE_WIDTH */
export const PIXELS_PER_METER = TABLE_WIDTH / 1.42;

/** Convert pixel distance to meters */
export function toMeters(px: number): number {
  return px / PIXELS_PER_METER;
}

/** Convert meters to pixel distance */
export function toPixels(m: number): number {
  return m * PIXELS_PER_METER;
}

// ---- Simulation -----------------------------------------------------------

/** Physics sub-steps per animation frame (120 Hz physics at 60 fps) */
export const SUB_STEPS = 2;

/** Fixed timestep per physics sub-step (seconds) */
export const PHYSICS_DT = 1 / 120;

/** Velocity threshold (m/s) below which a ball is considered stopped */
export const STOP_THRESHOLD = 0.02;

/** Angular velocity threshold (rad/s) */
export const OMEGA_THRESHOLD = 0.15;

/** Slip velocity threshold (m/s) for phase transition */
export const SLIP_THRESHOLD = 0.02;

// ---- Shot power mapping ---------------------------------------------------

/** Minimum shot velocity (m/s) at 0% power */
export const MIN_SHOT_VELOCITY = 0.5;

/** Maximum shot velocity (m/s) at 100% power */
export const MAX_SHOT_VELOCITY = 8.0;

/** Maximum omega magnitude from spin selector (rad/s) */
export const MAX_SPIN_OMEGA = 30;

// ---- UI / rendering -------------------------------------------------------

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

/** Legacy constants kept for SpinSelector UI (range [-1, 1]) */
export const MAX_SPIN = 1;
