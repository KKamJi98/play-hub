/** Immutable 2-D vector. Every operation returns a new instance. */
export class Vec2 {
  constructor(
    public readonly x: number,
    public readonly y: number,
  ) {}

  add(v: Vec2): Vec2 {
    return new Vec2(this.x + v.x, this.y + v.y);
  }

  sub(v: Vec2): Vec2 {
    return new Vec2(this.x - v.x, this.y - v.y);
  }

  scale(s: number): Vec2 {
    return new Vec2(this.x * s, this.y * s);
  }

  dot(v: Vec2): number {
    return this.x * v.x + this.y * v.y;
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  normalize(): Vec2 {
    const len = this.length();
    if (len === 0) return new Vec2(0, 0);
    return new Vec2(this.x / len, this.y / len);
  }

  /** Reflect this vector about a surface normal. */
  reflect(normal: Vec2): Vec2 {
    const d = 2 * this.dot(normal);
    return this.sub(normal.scale(d));
  }

  /** Euclidean distance to another point. */
  distance(v: Vec2): number {
    return this.sub(v).length();
  }

  static zero(): Vec2 {
    return new Vec2(0, 0);
  }
}
