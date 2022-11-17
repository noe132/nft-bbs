export class PollingTask {
  private timerId: NodeJS.Timeout | null = null;
  private task: (...args: Array<any>) => unknown;
  private stopFlag = false;
  private taskRunning = false;
  private currentJob: null | Promise<unknown> = null;

  public constructor(
    task: (...args: Array<any>) => unknown,
    private interval: number,
    startNow = true,
  ) {
    this.task = () => {
      const run = async () => {
        if (this.stopFlag) { return; }
        await Promise.resolve(task()).catch((e) => console.error(e));
        if (this.stopFlag) { return; }
        this.timerId = setTimeout(() => {
          this.task();
        }, this.interval);
      };

      this.taskRunning = true;
      this.currentJob = run();
      this.currentJob.finally(() => {
        this.taskRunning = false;
        this.currentJob = null;
      });
    };
    if (startNow) {
      this.task();
    }
  }

  public start(runOnStart = false) {
    if (runOnStart) {
      this.task();
    } else {
      this.timerId = setTimeout(this.task, this.interval);
    }
  }

  public stop() {
    if (this.timerId) {
      clearTimeout(this.timerId);
    }
    this.stopFlag = true;
    return this.currentJob;
  }

  public runImmediately() {
    if (this.stopFlag || this.taskRunning) {
      return;
    }
    if (this.timerId) {
      clearTimeout(this.timerId);
    }
    this.task();
  }
}
