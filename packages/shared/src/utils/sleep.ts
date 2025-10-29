/**
 * Pauses the execution of the current thread for a specified number of milliseconds.
 *
 * @param ms - The number of milliseconds to sleep
 * @returns A promise that resolves after the specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
