import { PickupCode } from "../domain/PickupCode";
import { IAssignmentRepository } from "./interfaces/IAssignmentRepository";

export class PickupCodeGenerator {
  constructor(private readonly assignmentRepo: IAssignmentRepository) {}

  generate(): PickupCode {
    let code: string;
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (code.length < 6 || this.assignmentRepo.isCodeInUse(code));

    return new PickupCode(code);
  }
}
