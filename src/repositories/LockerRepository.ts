import { Locker } from "../domain/Locker";
import { LockerSize } from "../domain/types";
import { ILockerRepository } from "../services/interfaces/ILockerRepository";

export class LockerRepository implements ILockerRepository {
  private lockers = new Map<string, Locker>();

  save(locker: Locker): void {
    this.lockers.set(locker.id, locker);
  }

  findById(id: string): Locker | undefined {
    return this.lockers.get(id);
  }

  findAll(): Locker[] {
    return Array.from(this.lockers.values());
  }

  findAvailableBySize(size: LockerSize): Locker[] {
    return this.findAll().filter((l) => l.isAvailable() && l.canFit(size));
  }
}
