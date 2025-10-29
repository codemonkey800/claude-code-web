import { sleep } from './sleep'

describe('sleep', () => {
  beforeEach(() => {
    jest.clearAllTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should return a promise', () => {
    const result = sleep(100)
    expect(result).toBeInstanceOf(Promise)
  })

  it('should resolve after the specified number of milliseconds', async () => {
    jest.useFakeTimers()
    const sleepPromise = sleep(1000)

    // Fast-forward time by 999ms - should not resolve yet
    jest.advanceTimersByTime(999)
    await Promise.resolve() // Allow microtasks to run
    let resolved = false
    void sleepPromise.then(() => {
      resolved = true
    })
    await Promise.resolve()
    expect(resolved).toBe(false)

    // Fast-forward time by 1ms more (total 1000ms) - should resolve now
    jest.advanceTimersByTime(1)
    await sleepPromise
    expect(resolved).toBe(true)
  })

  it('should resolve with undefined', async () => {
    jest.useFakeTimers()
    const sleepPromise = sleep(100)
    jest.advanceTimersByTime(100)
    const result = await sleepPromise
    expect(result).toBeUndefined()
  })

  it('should handle zero milliseconds', async () => {
    jest.useFakeTimers()
    const sleepPromise = sleep(0)
    jest.advanceTimersByTime(0)
    await expect(sleepPromise).resolves.toBeUndefined()
  })

  it('should handle multiple concurrent sleep calls independently', async () => {
    jest.useFakeTimers()
    const sleep1 = sleep(100)
    const sleep2 = sleep(200)
    const sleep3 = sleep(300)

    let resolved1 = false
    let resolved2 = false
    let resolved3 = false

    void sleep1.then(() => {
      resolved1 = true
    })
    void sleep2.then(() => {
      resolved2 = true
    })
    void sleep3.then(() => {
      resolved3 = true
    })

    // After 100ms, only first should resolve
    jest.advanceTimersByTime(100)
    await Promise.resolve()
    expect(resolved1).toBe(true)
    expect(resolved2).toBe(false)
    expect(resolved3).toBe(false)

    // After 200ms total, first two should resolve
    jest.advanceTimersByTime(100)
    await Promise.resolve()
    expect(resolved1).toBe(true)
    expect(resolved2).toBe(true)
    expect(resolved3).toBe(false)

    // After 300ms total, all should resolve
    jest.advanceTimersByTime(100)
    await Promise.resolve()
    expect(resolved1).toBe(true)
    expect(resolved2).toBe(true)
    expect(resolved3).toBe(true)
  })

  it('should work correctly in real time', async () => {
    const startTime = Date.now()
    await sleep(50)
    const endTime = Date.now()
    const elapsed = endTime - startTime

    // Allow for some timing variance (±10ms)
    expect(elapsed).toBeGreaterThanOrEqual(45)
    expect(elapsed).toBeLessThan(100)
  })
})
