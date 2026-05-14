import { LockerAssignment } from "../domain/LockerAssignment";
import { IAssignmentRepository } from "../services/interfaces/IAssignmentRepository";

export class AssignmentRepository implements IAssignmentRepository {
  private assignments = new Map<string, LockerAssignment>();

  save(assignment: LockerAssignment): void {
    this.assignments.set(assignment.lockerId, assignment);
  }

  findByLockerId(lockerId: string): LockerAssignment | undefined {
    return this.assignments.get(lockerId);
  }

  remove(lockerId: string): void {
    this.assignments.delete(lockerId);
  }

  isCodeInUse(code: string): boolean {
    return Array.from(this.assignments.values()).some(
      (a) => a.pickupCode.value === code,
    );
  }
}
