import { confirm, input, select } from "@inquirer/prompts";
import { PackageRetrievalService } from "../../services/PackageRetrievalService";

export async function customerMenu(
  retrievalService: PackageRetrievalService,
): Promise<void> {
  while (true) {
    console.log("\n─── Customer ────────────────────────────");

    const action = await select({
      message: "What would you like to do?",
      choices: ["Retrieve my package", "Back"],
    });

    if (action === "Back") return;

    if (action === "Retrieve my package") {
      const lockerId = await input({
        message: "Please enter locker Id:",
        required: true,
      });
      const pickupCode = await input({
        message: "Please enter your pickup code associated with the locker:",
        required: true,
      });

      try {
        const result = retrievalService.retrieve(lockerId, pickupCode);
        console.log(
          `Package ${result.packageId} | Storage charge: $${result.storageCharge.toFixed(2)}`,
        );
        const confirmation = await confirm({
          message: `Confirm retrieve package with charges $${result.storageCharge.toFixed(2)}?`,
        });
        if (confirmation) {
          retrievalService.confirmRetrieve(lockerId, pickupCode);
          console.log(
            `Package ${result.packageId} retrieved | Storage charge: $${result.storageCharge.toFixed(2)}`,
          );
          console.log(`Locker ${lockerId} released`);
        }
      } catch (err) {
        console.error((err as Error).message);
      }
    }
  }
}
