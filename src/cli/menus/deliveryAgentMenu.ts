import { input, select } from "@inquirer/prompts";
import { LockerSize } from "../../domain/types";
import { LockerFinderService } from "../../services/LockerFinderService";
import { PackageStorageService } from "../../services/PackageStorageService";

export async function deliveryAgentMenu(
  lockerfinder: LockerFinderService,
  storageService: PackageStorageService,
): Promise<void> {
  while (true) {
    console.log("\n─── Delivery Agent ──────────────────────");

    const action = await select({
      message: "What would you like to do?",
      choices: ["Store a package", "View available lockers", "Back"],
    });

    if (action === "Back") return;

    if (action === "View available lockers") {
      const available = lockerfinder.findAll().filter((l) => l.isAvailable());
      if (available.length === 0) {
        console.log("\nNo lockers available.");
      } else {
        console.log("\nID\t SIZE");
        console.log("──\t ────");
        available.forEach((l) => console.log(`${l.id}\t ${l.size}`));
      }
      continue;
    }

    if (action === "Store a package") {
      const size = await select({
        message: "Select package size:",
        choices: [
          { name: "Small", value: LockerSize.SMALL },
          { name: "Medium", value: LockerSize.MEDIUM },
          { name: "Large", value: LockerSize.LARGE },
        ],
      });

      const ownerName = await input({
        message: "Enter owner name:",
        validate: (input: string) =>
          input.trim().length > 0 ? true : "Owner name cannot be empty",
      });

      try {
        const result = await storageService.store(size, ownerName.trim());
        console.log("\n✔ Package stored successfully");
        console.log(`  Locker:      ${result.lockerId}`);
        console.log(`  Pickup Code: ${result.pickupCode}`);
        console.log("  Share the locker ID and pickup code with the customer.");
      } catch (err) {
        console.log(`\n✘ ${(err as Error).message}`);
      }
    }
  }
}
