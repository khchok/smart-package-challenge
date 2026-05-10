import { input, select } from "@inquirer/prompts";
import { AssignmentRepository } from "../../repositories/AssignmentRepository";
import { LockerRepository } from "../../repositories/LockerRepository";
import { PackageRetrievalService } from "../../services/PackageRetrievalService";

export async function customerMenu(
  lockerRepo: LockerRepository,
  assignmentRepo: AssignmentRepository,
): Promise<void> {
  while (true) {
    console.log("\n─── Customer ────────────────────────────");

    const action = await select({
      message: "What would you like to do?",
      choices: ["Retrieve my package", "Back"],
    });

    if (action === "Back") return;

    if (action === "Retrieve my package") {
      const service = new PackageRetrievalService(lockerRepo, assignmentRepo);
      const lockerId = await input({
        message: "Please enter locker Id:",
        required: true,
      });
      const pickupCode = await input({
        message: "Please enter your pickup code associated with the locker:",
        required: true,
      });

      try {
        const result = service.retrieve(lockerId, pickupCode);
        console.log(
          `Package ${result.packageId} retrieved | Storage charge: $${result.storageCharge.toFixed(2)}`,
        );
      } catch (err) {
        console.error((err as Error).message);
      }
    }
  }
}
