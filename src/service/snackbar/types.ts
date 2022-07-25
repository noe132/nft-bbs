interface SnackbarBase {
  /** 显示文本 */
  content: string
  /** 不显示 close button */
  noClose?: boolean
  /** 自动隐藏时间 (默认 3000ms) */
  duration?: number
  nonBlocking?: boolean
  /** 尽快显示 */
  urgent?: boolean
}

type SnackbarAction = {
  /** 动作按钮 callback */
  action: (...args: Array<any>) => unknown
  /** 动作按钮文本 */
  actionText: string
} | {
  action?: undefined
  actionText?: undefined
};

export type SnackbarItemParam = SnackbarBase & SnackbarAction;
export type SnackbarItemData = SnackbarItemParam & {
  type: 'plain' | 'error'
};

export interface ShowFunction {
  (p: SnackbarItemParam): unknown
  /**
   * @param content - 显示文本
   * @param duration - 自动隐藏时间 (默认 3000ms)
   */
  (content: string, duration?: number): unknown
}
