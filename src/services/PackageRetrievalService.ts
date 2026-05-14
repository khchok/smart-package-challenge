import { IAssignmentRepository } from "./interfaces/IAssignmentRepository";
import { ILockerRepository } from "./interfaces/ILockerRepository";
import { StorageChargeCalculator } from "./StorageChargeCalculator";

export interface RetrievalResult {
  packageId: string;
  storageCharge: number;
}

export class PackageRetrievalService {
  private readonly calculator = new StorageChargeCalculator();

  constructor(
    private readonly lockerRepo: ILockerRepository,
    private readonly assignmentRepo: IAssignmentRepository,
  ) {}

  private getLockerAssignment(lockerId: string, pickupCode: string) {
    const locker = this.lockerRepo.findById(lockerId);
    if (!locker) throw new Error(`Unknown locker: ${lockerId}`);

    const assignment = this.assignmentRepo.findByLockerId(lockerId);
    if (!assignment) throw new Error(`Locker ${lockerId} is not occupied`);

    if (!assignment.pickupCode.matches(pickupCode)) {
      throw new Error("Invalid pickup code");
    }

    return { locker, assignment };
  }

  retrieve(lockerId: string, pickupCode: string): RetrievalResult {
    const { locker, assignment } = this.getLockerAssignment(
      lockerId,
      pickupCode,
    );
    const storageCharge = this.calculator.calculate(assignment.storedAt);

    // locker.release();
    // this.assignmentRepo.remove(lockerId);

    return { packageId: assignment.packageId, storageCharge };
  }

  confirmRetrieve(
    lockerId: string,
    pickupCode: string,
  ): Omit<RetrievalResult, "storageCharge"> {
    // validate again
    const { locker, assignment } = this.getLockerAssignment(
      lockerId,
      pickupCode,
    );

    locker.release();
    this.assignmentRepo.remove(lockerId);

    return { packageId: assignment.packageId };
  }
}
