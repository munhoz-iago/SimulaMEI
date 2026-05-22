'use client'

import { useEffect, useRef, useState } from 'react'

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'failed'

/**
 * Scheduler puro de debounce-then-save, isolado do React pra ser testável
 * com fake timers sem precisar de testing-library.
 *
 * Uso:
 *   const sched = new DebouncedSaveScheduler(onSave, delay, onStatus)
 *   sched.schedule(value)   // agenda; cancela timer anterior se houver
 *   sched.cancel()          // limpa timer pendente
 *
 * Notifica status via `onStatus`: 'saving' → 'saved' | 'failed'.
 */
export class DebouncedSaveScheduler<T> {
  private timer: ReturnType<typeof setTimeout> | null = null
  private lastSaved: T | undefined
  private hasLastSaved = false
  private delay: number

  constructor(
    private readonly onSave: (value: T) => Promise<void>,
    delay: number,
    private readonly onStatus: (status: AutoSaveStatus) => void,
  ) {
    this.delay = delay
  }

  setBaseline(value: T) {
    this.lastSaved = value
    this.hasLastSaved = true
  }

  /** Atualiza o delay em uso. Timer pendente NÃO é reagendado — só novos
   *  schedule()s usam o novo valor. Comportamento intencional pra não
   *  cancelar um save quase-concluído. */
  setDelay(delay: number) {
    this.delay = delay
  }

  schedule(value: T) {
    if (this.hasLastSaved && Object.is(value, this.lastSaved)) return
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      this.flush(value)
    }, this.delay)
  }

  /** Executa o save imediatamente (sem aguardar debounce). */
  async flush(value: T) {
    this.onStatus('saving')
    try {
      await this.onSave(value)
      this.lastSaved = value
      this.hasLastSaved = true
      this.onStatus('saved')
    } catch {
      this.onStatus('failed')
    }
  }

  cancel() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
}

interface UseDebouncedAutoSaveOptions<T> {
  value: T
  onSave: (value: T) => Promise<void>
  delay?: number
  /** Quando false, o hook não agenda saves — sai como 'idle'. */
  enabled?: boolean
}

/**
 * Hook React fininho: dispara `onSave(value)` `delay` ms após a última
 * mudança de `value`. Edições subsequentes cancelam o save anterior.
 * Retorna `{ status }`: idle → saving → saved (ou failed em erro).
 *
 * Quando `enabled` é false, o hook fica passivo e devolve `idle` —
 * útil pra calculadora efêmera sem contexto de persistência.
 */
export function useDebouncedAutoSave<T>({
  value,
  onSave,
  delay = 1500,
  enabled = true,
}: UseDebouncedAutoSaveOptions<T>): { status: AutoSaveStatus } {
  const [status, setStatus] = useState<AutoSaveStatus>('idle')
  const onSaveRef = useRef(onSave)
  const schedulerRef = useRef<DebouncedSaveScheduler<T> | null>(null)
  const baselineSetRef = useRef(false)

  // Mantém a referência da última função de save, sem reagendar.
  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    if (!enabled) return

    if (!schedulerRef.current) {
      schedulerRef.current = new DebouncedSaveScheduler<T>(
        (v: T) => onSaveRef.current(v),
        delay,
        setStatus,
      )
    } else {
      // Re-render com novo delay: scheduler reage sem perder baseline/state.
      schedulerRef.current.setDelay(delay)
    }

    // Primeira renderização: o valor inicial é o "baseline" (já salvo),
    // não deve disparar save.
    if (!baselineSetRef.current) {
      schedulerRef.current.setBaseline(value)
      baselineSetRef.current = true
      return
    }

    schedulerRef.current.schedule(value)

    return () => {
      schedulerRef.current?.cancel()
    }
  }, [value, delay, enabled])

  return { status }
}
