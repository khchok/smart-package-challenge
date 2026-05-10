import { select } from "@inquirer/prompts";
import { AssignmentRepository } from "../../repositories/AssignmentRepository";
import { LockerRepository } from "../../repositories/LockerRepository";

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
      console.log("\nComing in Level 2...");
    }
  }
}
