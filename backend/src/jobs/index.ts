// Implement a job class that comes with a logger than we can extend for the different jobs.

import { type ILogObj, Logger } from "tslog";

export abstract class Job {
  protected readonly log: Logger<ILogObj>;

  constructor(name: string) {
    this.log = new Logger({ name });
  }

  /**
   * Run the job
   * @param args - The arguments for the job
   * @returns The result of the job execution
   */
  abstract run(args: Record<string, unknown>): Promise<unknown>;
}
