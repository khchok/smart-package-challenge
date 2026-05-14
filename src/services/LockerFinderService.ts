import { Locker } from "../domain/Locker";
import { LockerSize } from "../domain/types";
import { ILockerRepository } from "./interfaces/ILockerRepository";

const SIZE_RANK: Record<LockerSize, number> = {
  [LockerSize.SMALL]: 1,
  [LockerSize.MEDIUM]: 2,
  [LockerSize.LARGE]: 3,
};

export class LockerFinderService {
  constructor(private readonly lockerRepo: ILockerRepository) {}

  findSmallestFit(packageSize: LockerSize): Locker | null {
    const candidates = this.lockerRepo.findAvailableBySize(packageSize);
    if (candidates.length === 0) return null;
    return candidates.sort((a, b) => SIZE_RANK[a.size] - SIZE_RANK[b.size])[0];
  }

  findAll(): Locker[] {
    return this.lockerRepo.findAll();
  }
}
