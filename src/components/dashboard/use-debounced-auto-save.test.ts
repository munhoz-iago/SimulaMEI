import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DebouncedSaveScheduler,
  type AutoSaveStatus,
} from './use-debounced-auto-save'

describe('DebouncedSaveScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('dispara onSave após delay', async () => {
    const onSave = vi.fn(async () => {})
    const statuses: AutoSaveStatus[] = []
    const sched = new DebouncedSaveScheduler(onSave, 1500, s => statuses.push(s))

    sched.setBaseline(100)
    sched.schedule(200)
    expect(onSave).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1500)

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith(200)
    expect(statuses).toEqual(['saving', 'saved'])
  })

  it('edição rápida cancela save anterior', async () => {
    const onSave = vi.fn(async () => {})
    const sched = new DebouncedSaveScheduler(onSave, 1500, () => {})

    sched.setBaseline(0)
    sched.schedule(100)
    await vi.advanceTimersByTimeAsync(500)
    sched.schedule(200)
    await vi.advanceTimersByTimeAsync(500)
    sched.schedule(300)
    expect(onSave).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1500)

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith(300)
  })

  it('valor igual ao baseline não dispara save', async () => {
    const onSave = vi.fn(async () => {})
    const sched = new DebouncedSaveScheduler(onSave, 1500, () => {})

    sched.setBaseline(500)
    sched.schedule(500)

    await vi.advanceTimersByTimeAsync(2000)

    expect(onSave).not.toHaveBeenCalled()
  })

  it('falha do onSave reporta status "failed"', async () => {
    const onSave = vi.fn(async () => {
      throw new Error('network')
    })
    const statuses: AutoSaveStatus[] = []
    const sched = new DebouncedSaveScheduler(onSave, 1000, s => statuses.push(s))

    sched.setBaseline(0)
    sched.schedule(100)
    await vi.advanceTimersByTimeAsync(1000)
    // O save em si é async; precisamos drenar microtasks.
    await Promise.resolve()
    await Promise.resolve()

    expect(statuses).toEqual(['saving', 'failed'])
  })

  it('cancel() limpa o timer pendente', async () => {
    const onSave = vi.fn(async () => {})
    const sched = new DebouncedSaveScheduler(onSave, 1500, () => {})

    sched.setBaseline(0)
    sched.schedule(100)
    sched.cancel()

    await vi.advanceTimersByTimeAsync(5000)

    expect(onSave).not.toHaveBeenCalled()
  })

  it('após save bem-sucedido, mesmo valor não re-dispara', async () => {
    const onSave = vi.fn(async () => {})
    const sched = new DebouncedSaveScheduler(onSave, 1000, () => {})

    sched.setBaseline(0)
    sched.schedule(100)
    await vi.advanceTimersByTimeAsync(1000)
    expect(onSave).toHaveBeenCalledTimes(1)

    sched.schedule(100)
    await vi.advanceTimersByTimeAsync(2000)
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('setDelay altera o delay de schedules subsequentes', async () => {
    const onSave = vi.fn(async () => {})
    const sched = new DebouncedSaveScheduler(onSave, 1500, () => {})

    sched.setBaseline(0)
    sched.setDelay(500)
    sched.schedule(100)

    // Com delay novo (500ms), deve disparar em 500 — não em 1500
    await vi.advanceTimersByTimeAsync(500)
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith(100)
  })

  it('setDelay não cancela timer pendente (atual delay roda até o fim)', async () => {
    const onSave = vi.fn(async () => {})
    const sched = new DebouncedSaveScheduler(onSave, 1500, () => {})

    sched.setBaseline(0)
    sched.schedule(100)
    await vi.advanceTimersByTimeAsync(500)

    // Muda delay no meio do timer pendente
    sched.setDelay(5000)

    // Timer original de 1500 ms continua e dispara
    await vi.advanceTimersByTimeAsync(1000)
    expect(onSave).toHaveBeenCalledTimes(1)
  })
})
