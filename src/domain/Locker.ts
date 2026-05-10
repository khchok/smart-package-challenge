import { LockerSize, LockerStatus } from "./types";

const SIZE_RANK: Record<LockerSize, number> = {
  [LockerSize.SMALL]: 1,
  [LockerSize.MEDIUM]: 2,
  [LockerSize.LARGE]: 3,
};

export class Locker {
  readonly id: string;
  readonly size: LockerSize;
  private status: LockerStatus = LockerStatus.AVAILABLE;

  constructor(id: string, size: LockerSize) {
    this.id = id;
    this.size = size;
  }

  occupy() {
    if (!this.isAvailable()) {
      throw new Error(`Locker ${this.id} is already occupied`);
    }
    this.status = LockerStatus.OCCUPIED;
  }

  release() {
    if (this.isAvailable()) {
      throw new Error(`Locker ${this.id} is already available`);
    }
    this.status = LockerStatus.AVAILABLE;
  }

  canFit(packageSize: LockerSize): boolean {
    return SIZE_RANK[this.size] >= SIZE_RANK[packageSize];
  }

  isAvailable() {
    return this.status === LockerStatus.AVAILABLE;
  }

  getStatus() {
    return this.status;
  }
}
