import { select } from "@inquirer/prompts";
import { LockerFinderService } from "../../services/LockerFinderService";

export async function adminMenu(
  lockerFinder: LockerFinderService,
): Promise<void> {
  while (true) {
    console.log("\n─── Admin ───────────────────────────────");

    const action = await select({
      message: "What would you like to do?",
      choices: ["View all lockers", "Back"],
    });

    if (action === "Back") return;

    if (action === "View all lockers") {
      const lockers = lockerFinder.findAll();
      console.log("\nID\t SIZE\t\t STATUS");
      console.log("──\t ────\t\t ──────");
      lockers.forEach((l) =>
        console.log(`${l.id}\t ${l.size}\t\t ${l.getStatus()}`),
      );
    }
  }
}
