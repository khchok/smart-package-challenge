const RATE = 1.0;

export class StorageChargeCalculator {
  calculate(storedAt: Date, retrieveAt: Date = new Date()): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const days = Math.max(
      1,
      Math.ceil(retrieveAt.getTime() - storedAt.getTime()) / msPerDay,
    );

    let charge = 0;
    for (let day = 1; day <= days; day++) {
      if (day <= 5) charge += RATE;
      else if (day <= 10) charge += RATE * 2;
      else charge += RATE * 3;
    }
    return Math.round(charge * 100) / 100;
  }
}
