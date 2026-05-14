import { LockerAssignment } from "../../domain/LockerAssignment";

export interface IAssignmentRepository {
  save: (assignment: LockerAssignment) => void;

  findByLockerId: (lockerId: string) => LockerAssignment | undefined;

  remove: (lockerId: string) => void;

  isCodeInUse: (code: string) => boolean;
}
