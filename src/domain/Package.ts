import { LockerSize } from "./types";

export class Package {
  readonly id: string;
  readonly size: LockerSize;
  readonly ownerName: string;

  constructor(id: string, size: LockerSize, ownerName: string) {
    this.id = id;
    this.size = size;
    this.ownerName = ownerName;
  }
}
