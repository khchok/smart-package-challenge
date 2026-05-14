import { Locker } from "../../domain/Locker";
import { LockerSize } from "../../domain/types";

export interface ILockerRepository {
  save: (locker: Locker) => void;

  findById: (id: string) => Locker | undefined;

  findAll: () => Locker[];

  findAvailableBySize: (size: LockerSize) => Locker[];
}
