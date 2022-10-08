export class PollingTask {
  private timerId: NodeJS.Timeout | null = null;
  private task: (...args: Array<any>) => unknown;
  private stopFlag = false;
  private taskRunning = false;

  public constructor(
    task: (...args: Array<any>) => unknown,
    private interval: number,
    startNow = true,
  ) {
    this.task = async () => {
      if (this.stopFlag) { return; }
      this.taskRunning = true;
      await Promise.resolve(task()).catch((e) => console.error(e));
      this.taskRunning = false;
      if (this.stopFlag) { return; }
      this.timerId = setTimeout(() => {
        this.task();
      }, this.interval);
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
