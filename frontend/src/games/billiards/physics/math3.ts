export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export function vec3(x: number, y: number, z: number): Vec3Like {
  return { x, y, z };
}

export function scale3(v: Vec3Like, scalar: number): Vec3Like {
  return vec3(v.x * scalar, v.y * scalar, v.z * scalar);
}

export function dot3(a: Vec3Like, b: Vec3Like): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross3(a: Vec3Like, b: Vec3Like): Vec3Like {
  return vec3(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x,
  );
}

export function length3(v: Vec3Like): number {
  return Math.sqrt(dot3(v, v));
}

export function normalize3(v: Vec3Like): Vec3Like {
  const length = length3(v);
  if (length === 0) return vec3(0, 0, 0);
  return scale3(v, 1 / length);
}

export function clampMagnitude3(v: Vec3Like, maxMagnitude: number): Vec3Like {
  const length = length3(v);
  if (length <= maxMagnitude || length === 0) return v;
  return scale3(v, maxMagnitude / length);
}
