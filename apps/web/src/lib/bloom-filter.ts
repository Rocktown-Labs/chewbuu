/* eslint-disable no-bitwise */
export class BloomFilter {
  private size: number;
  private hashCount: number;
  private bitArray: Uint8Array;

  constructor(size = 2048, hashCount = 4) {
    this.size = size;
    this.hashCount = hashCount;
    this.bitArray = new Uint8Array(Math.ceil(size / 8));
  }

  private hash(str: string, seed: number): number {
    let hash = seed;
    for (let i = 0; i < str.length; i += 1) {
      const code = str.codePointAt(i) ?? 0;
      hash = (hash * 31 + code) % this.size;
    }
    return Math.abs(hash);
  }

  public add(item: string): void {
    const normalized = item.trim().toLowerCase();
    for (let i = 0; i < this.hashCount; i += 1) {
      const index = this.hash(normalized, i + 1);
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;
      this.bitArray[byteIndex] |= 1 << bitIndex;
    }
  }

  public mightContain(item: string): boolean {
    const normalized = item.trim().toLowerCase();
    if (!normalized) return false;

    for (let i = 0; i < this.hashCount; i += 1) {
      const index = this.hash(normalized, i + 1);
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;
      if ((this.bitArray[byteIndex] & (1 << bitIndex)) === 0) {
        return false;
      }
    }
    return true;
  }
}
