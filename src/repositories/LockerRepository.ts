import { Locker } from "../domain/Locker";
import { LockerSize } from "../domain/types";

export class LockerRepository {
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
