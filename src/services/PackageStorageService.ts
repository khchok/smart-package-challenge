import { Mutex } from "async-mutex";
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
  private readonly mutex = new Mutex();

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
    return this.mutex.runExclusive(async () => {
      const locker = this.lockerFinder.findSmallestFit(size);
      if (!locker) {
        throw new Error(`No suitable locker available for size ${size}`);
      }

      // NOTE: adding promise to simulate concurrent calls
      await new Promise((resolve) => setTimeout(resolve, 200));

      const pkg = new Package(randomUUID(), size, ownerName);
      const pickupCode = this.codeGenerator.generate();
      const assignment = new LockerAssignment(locker.id, pkg.id, pickupCode);

      locker.occupy();
      this.assignmentRepo.save(assignment);

      return { lockerId: locker.id, pickupCode: pickupCode.value };
    });
  }

  async storeWithoutMutex(
    size: LockerSize,
    ownerName: string,
  ): Promise<StoreResult> {
    const locker = this.lockerFinder.findSmallestFit(size);
    if (!locker) {
      throw new Error(`No suitable locker available for size ${size}`);
    }

    // NOTE: adding promise to simulate concurrent calls
    await new Promise((resolve) => setTimeout(resolve, 200));

    const pkg = new Package(randomUUID(), size, ownerName);
    const pickupCode = this.codeGenerator.generate();
    const assignment = new LockerAssignment(locker.id, pkg.id, pickupCode);

    locker.occupy();
    this.assignmentRepo.save(assignment);

    return { lockerId: locker.id, pickupCode: pickupCode.value };
  }
}
