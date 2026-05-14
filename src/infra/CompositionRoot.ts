import { AssignmentRepository } from "../repositories/AssignmentRepository";
import { LockerRepository } from "../repositories/LockerRepository";
import { LockerFinderService } from "../services/LockerFinderService";
import { PackageRetrievalService } from "../services/PackageRetrievalService";
import { PackageStorageService } from "../services/PackageStorageService";
import { PickupCodeGenerator } from "../services/PickupCodeGenerator";
import { seedLockers } from "./seed";

export class CompositionRoot {
  static async setup() {
    // NOTE: simulate async calls (DbClient, external dependencies)
    await new Promise((resolve) => setTimeout(resolve, 100));

    const lockerRepo = new LockerRepository();
    const assignmentRepo = new AssignmentRepository();

    const lockerFinderService = new LockerFinderService(lockerRepo);

    const packageRetrievalService = new PackageRetrievalService(
      lockerRepo,
      assignmentRepo,
    );

    const pickupCodeGenerator = new PickupCodeGenerator(assignmentRepo);

    const packageStorageService = new PackageStorageService(
      lockerFinderService,
      assignmentRepo,
      pickupCodeGenerator,
    );

    seedLockers(lockerRepo);

    return {
      lockerFinderService,
      packageStorageService,
      packageRetrievalService,
      pickupCodeGenerator,
    };
  }
}
