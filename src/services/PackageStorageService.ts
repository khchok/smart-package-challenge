import { randomUUID } from "crypto";
import { LockerAssignment } from "../domain/LockerAssignment";
import { Package } from "../domain/Package";
import { LockerSize } from "../domain/types";
import { AssignmentRepository } from "../repositories/AssignmentRepository";
import { LockerRepository } from "../repositories/LockerRepository";
import { LockerFinder } from "./LockerFinder";
import { PickupCodeGenerator } from "./PickupCodeGenerator";

export interface StoreResult {
  lockerId: string;
  pickupCode: string;
}

export class PackageStorageService {
  private readonly lockerFinder: LockerFinder;
  private readonly codeGenerator: PickupCodeGenerator;
  private readonly lockerRepo: LockerRepository;
  private readonly assignmentRepo: AssignmentRepository;
  constructor(
    lockerRepo: LockerRepository,
    assignmentRepo: AssignmentRepository,
  ) {
    this.lockerRepo = lockerRepo;
    this.assignmentRepo = assignmentRepo;
    this.lockerFinder = new LockerFinder(lockerRepo);
    this.codeGenerator = new PickupCodeGenerator(assignmentRepo);
  }

  async store(size: LockerSize, ownerName: string): Promise<StoreResult> {
    const locker = this.lockerFinder.findSmallestFit(size);
    if (!locker) {
      throw new Error(`No suitable locker available for size ${size}`);
    }

    const pkg = new Package(randomUUID(), size, ownerName);
    const pickupCode = this.codeGenerator.generate();
    const assignment = new LockerAssignment(locker.id, pkg.id, pickupCode);

    locker.occupy();
    this.assignmentRepo.save(assignment);

    return { lockerId: locker.id, pickupCode: pickupCode.value };
  }
}
