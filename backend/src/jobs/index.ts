// Implement a job class that comes with a logger than we can extend for the different jobs.

import { type ILogObj, Logger } from "tslog";

export class Job {
  protected readonly log: Logger<ILogObj>;

  constructor(name: string) {
    this.log = new Logger({ name });
  }

  async run(_args: Record<string, unknown>): Promise<unknown> {
    return await Promise.resolve(null);
  }
}
