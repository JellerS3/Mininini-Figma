import { useCallback, useEffect, useRef, useState } from 'react'
import type { Viewport } from '../utils/geometry'
import { zoomAt } from '../utils/geometry'

/**
 * КАМЕРА холста: панорамирование (пробел + мышь или средняя кнопка)
 * и зум колесом от 10% до 400%.
 *
 * Хук ничего не знает об интерфейсе — возвращает состояние и обработчики,
 * которые Canvas просто навешивает на свои события.
 */
export function useViewport(canvasRef: React.RefObject<HTMLElement | null>) {
  const [viewport, setViewport] = useState<Viewport>({
    zoom: 1,
    panX: 0,
    panY: 0,
  })

  const [spacePressed, setSpacePressed] = useState(false)
  const panState = useRef<{ lastX: number; lastY: number } | null>(null)

  /** Зажат ли пробел — по нему Canvas меняет курсор на «руку». */
  const isPanningAvailable = spacePressed

  // --- Пробел: отслеживаем глобально, независимо от фокуса на элементе. ---
  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false
      return (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      )
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTypingTarget(e.target)) {
        // Не даём странице проскроллиться по пробелу.
        e.preventDefault()
        setSpacePressed(true)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // Сброс при потере фокуса окна (иначе «пробел залипает»).
    const onBlur = () => {
      setSpacePressed(false)
      panState.current = null
    }
    window.addEventListener('blur', onBlur)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  /**
   * Начать панорамирование. Вызывается из Canvas при mousedown
   * (с зажатым пробелом или средней кнопкой мыши).
   */
  const startPan = useCallback((screenX: number, screenY: number) => {
    panState.current = { lastX: screenX, lastY: screenY }
  }, [])

  /**
   * Продолжить панорамирование — двигаем пан, а не точку под курсором.
   * Вызывается из Canvas на mousemove, пока зажата кнопка.
   */
  const movePan = useCallback((screenX: number, screenY: number) => {
    const state = panState.current
    if (!state) return
    const dx = screenX - state.lastX
    const dy = screenY - state.lastY
    panState.current = { lastX: screenX, lastY: screenY }
    setViewport((v) => ({
      ...v,
      panX: v.panX + dx,
      panY: v.panY + dy,
    }))
  }, [])

  /** Закончить панорамирование. */
  const endPan = useCallback(() => {
    panState.current = null
  }, [])

  /** Зум колесом: точка под курсором остаётся на месте.
   *  Shift + колесо занято масштабированием выделенной фигуры (см. Canvas),
   *  поэтому такой жест камерой не обрабатывается. */
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.shiftKey) return
      e.preventDefault()
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      setViewport((v) => {
        // На большинстве мышей deltaY кратно 100; тачпад шлёт маленькие значения.
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
        const next = zoomAt(v, factor, x, y)
        return next
      })
    },
    [canvasRef],
  )

  // Навешиваем wheel через addEventListener, т.к. React-овский onWheel — пассивный
  // и preventDefault() в нём не работает.
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [canvasRef, handleWheel])

  /**
   * Центрирование камеры при старте: начало координат канваса — в центре экрана.
   * Вызывается из Canvas один раз после того, как размер элемента стал известен.
   */
  const centerOnPoint = useCallback((screenX: number, screenY: number) => {
    setViewport((v) => ({ ...v, panX: screenX, panY: screenY }))
  }, [])

  return {
    viewport,
    setViewport,
    isPanningAvailable,
    startPan,
    movePan,
    endPan,
    centerOnPoint,
  }
}
