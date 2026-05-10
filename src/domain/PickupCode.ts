export class PickupCode {
  readonly value: string;

  constructor(value: string) {
    if (!value || value.length < 6) {
      throw new Error("Pickup code must be at least 6 characters");
    }
    this.value = value;
  }

  matches(input: string): boolean {
    // TODO: sanitize input
    return this.value == input;
  }
}
