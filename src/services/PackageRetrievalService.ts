import { AssignmentRepository } from "../repositories/AssignmentRepository";
import { LockerRepository } from "../repositories/LockerRepository";

export interface RetrievalResult {
  packageId: string;
  storageCharge: number;
}

export class PackageRetrievalService {
  constructor(
    private readonly lockerRepo: LockerRepository,
    private readonly assignmentRepo: AssignmentRepository,
  ) {}
  retrieve(lockerId: string, pickupCode: string): RetrievalResult {
    const locker = this.lockerRepo.findById(lockerId);
    if (!locker) throw new Error(`Unknown locker: ${lockerId}`);

    const assignment = this.assignmentRepo.findByLockerId(lockerId);
    if (!assignment) throw new Error(`Locker ${lockerId} is not occupied`);

    if (!assignment.pickupCode.matches(pickupCode)) {
      throw new Error("Invalid pickup code");
    }

    locker.release();
    this.assignmentRepo.remove(lockerId);

    return { packageId: assignment.packageId, storageCharge: 0 };
  }
}
