import { select } from "@inquirer/prompts";
import { seedLockers } from "../infra/seed";
import { AssignmentRepository } from "../repositories/AssignmentRepository";
import { LockerRepository } from "../repositories/LockerRepository";
import { adminMenu } from "./menus/adminMenu";
import { customerMenu } from "./menus/customerMenu";
import { deliveryAgentMenu } from "./menus/deliveryAgentMenu";

const lockerRepo = new LockerRepository();
const assignmentRepo = new AssignmentRepository();

seedLockers(lockerRepo);

async function main(): Promise<void> {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║     Smart Package Locker System      ║");
  console.log("╚══════════════════════════════════════╝");

  while (true) {
    const role = await select({
      message: "Select your role:",
      choices: ["Admin", "Delivery Agent", "Customer", "Exit"],
    });

    if (role === "Exit") {
      console.log("\nGoodbye!\n");
      process.exit(0);
    }

    if (role === "Admin") await adminMenu(lockerRepo);
    if (role === "Delivery Agent")
      await deliveryAgentMenu(lockerRepo, assignmentRepo);
    if (role === "Customer") await customerMenu(lockerRepo, assignmentRepo);
  }
}

main();
