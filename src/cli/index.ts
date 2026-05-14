import { select } from "@inquirer/prompts";
import { CompositionRoot } from "../infra/CompositionRoot";
import { adminMenu } from "./menus/adminMenu";
import { customerMenu } from "./menus/customerMenu";
import { deliveryAgentMenu } from "./menus/deliveryAgentMenu";

async function main(): Promise<void> {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║     Smart Package Locker System      ║");
  console.log("╚══════════════════════════════════════╝");
  const {
    lockerFinderService,
    packageStorageService,
    packageRetrievalService,
  } = await CompositionRoot.setup();

  try {
    while (true) {
      const role = await select({
        message: "Select your role:",
        choices: ["Admin", "Delivery Agent", "Customer", "Exit"],
      });

      if (role === "Exit") {
        console.log("\nGoodbye!\n");
        process.exit(0);
      }

      if (role === "Admin") await adminMenu(lockerFinderService);
      if (role === "Delivery Agent")
        await deliveryAgentMenu(lockerFinderService, packageStorageService);
      if (role === "Customer") await customerMenu(packageRetrievalService);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "ExitPromptError") {
      // NOTE: silence error for forced exit
    } else {
      throw error;
    }
  }
}

main();
