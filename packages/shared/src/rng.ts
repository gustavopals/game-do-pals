export class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  rangeInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pickOne<T>(items: T[]): T {
    if (items.length === 0) {
      throw new Error("Cannot pick from an empty list");
    }
    return items[this.rangeInt(0, items.length - 1)];
  }

  pickManyUnique<T>(items: T[], count: number): T[] {
    const copy = [...items];
    const selected: T[] = [];

    const target = Math.min(count, copy.length);
    for (let i = 0; i < target; i += 1) {
      const index = this.rangeInt(0, copy.length - 1);
      selected.push(copy[index]);
      copy.splice(index, 1);
    }

    return selected;
  }
}
