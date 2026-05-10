import { PickupCode } from "./PickupCode";

export class LockerAssignment {
  readonly lockerId: string;
  readonly packageId: string;
  readonly pickupCode: PickupCode;
  readonly storedAt: Date;

  constructor(
    lockerId: string,
    packageId: string,
    pickupCode: PickupCode,
    storedAt: Date = new Date(),
  ) {
    this.lockerId = lockerId;
    this.packageId = packageId;
    this.pickupCode = pickupCode;
    this.storedAt = storedAt;
  }
}
