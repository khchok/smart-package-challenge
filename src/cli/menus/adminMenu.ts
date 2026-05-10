import { select } from "@inquirer/prompts";
import { LockerRepository } from "../../repositories/LockerRepository";

export async function adminMenu(lockerRepo: LockerRepository): Promise<void> {
  while (true) {
    console.log("\n─── Admin ───────────────────────────────");

    const action = await select({
      message: "What would you like to do?",
      choices: ["View all lockers", "Back"],
    });

    if (action === "Back") return;

    if (action === "View all lockers") {
      const lockers = lockerRepo.findAll();
      console.log("\nID\t SIZE\t\t STATUS");
      console.log("──\t ────\t\t ──────");
      lockers.forEach((l) =>
        console.log(`${l.id}\t ${l.size}\t\t ${l.getStatus()}`),
      );
    }
  }
}
