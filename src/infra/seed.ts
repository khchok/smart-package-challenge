import { Locker } from "../domain/Locker";
import { LockerSize } from "../domain/types";
import { LockerRepository } from "../repositories/LockerRepository";

const INITIAL_LOCKERS: Array<{ id: string; size: LockerSize }> = [
  { id: "S1", size: LockerSize.SMALL },
  { id: "S2", size: LockerSize.SMALL },
  { id: "S3", size: LockerSize.SMALL },
  { id: "S4", size: LockerSize.SMALL },
  { id: "S5", size: LockerSize.SMALL },
  { id: "M1", size: LockerSize.MEDIUM },
  { id: "M2", size: LockerSize.MEDIUM },
  { id: "M3", size: LockerSize.MEDIUM },
  { id: "M4", size: LockerSize.MEDIUM },
  { id: "L1", size: LockerSize.LARGE },
  { id: "L2", size: LockerSize.LARGE },
  { id: "L3", size: LockerSize.LARGE },
];

export function seedLockers(lockerRepo: LockerRepository): void {
  for (const { id, size } of INITIAL_LOCKERS) {
    lockerRepo.save(new Locker(id, size));
  }
}
