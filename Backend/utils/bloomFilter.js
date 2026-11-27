const crypto = require("crypto");

class BloomFilter {
  /**
   * @param {number} n expected number of items
   * @param {number} p acceptable false-positive rate (0.01 = 1%)
   */
  constructor(n = 10000, p = 0.01) {
    this.m = Math.ceil((-n * Math.log(p)) / Math.LN2 ** 2); // number of bits
    this.k = Math.max(1, Math.round((this.m / n) * Math.LN2)); // positions per item
    this.bits = new Uint8Array(this.m);
    this.count = 0;
  }

  // One SHA-256 digest -> h1, h2 -> k positions using double hashing
  positions(item) {
    const digest = crypto.createHash("sha256").update(item).digest();
    const h1 = digest.readUInt32BE(0);
    const h2 = digest.readUInt32BE(4);
    const result = [];
    for (let i = 0; i < this.k; i++) {
      result.push((h1 + i * h2) % this.m);
    }
    return result;
  }

  add(item) {
    for (const pos of this.positions(item)) this.bits[pos] = 1;
    this.count++;
  }

  // false => definitely not present, true => probably present
  has(item) {
    return this.positions(item).every((pos) => this.bits[pos] === 1);
  }

  // Positions plus the current bit value at each one (for the UI)
  inspect(item) {
    return this.positions(item).map((pos) => ({ position: pos, bit: this.bits[pos] }));
  }

  // Percentage of bits currently set to 1
  fillRatio() {
    let ones = 0;
    for (let i = 0; i < this.m; i++) ones += this.bits[i];
    return ones / this.m;
  }
}

const filter = new BloomFilter(10000, 0.01);

const stats = { totalChecks: 0, dbHitsSaved: 0, dbHits: 0, falsePositives: 0 };

module.exports = { BloomFilter, filter, stats };
