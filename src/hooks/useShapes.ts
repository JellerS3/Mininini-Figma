import { useCallback, useRef, useState } from 'react'
import type { HandleId, Point, Rect, Shape } from '../types/shape'
import { MIN_SHAPE_SIZE } from '../constants/tools'
import { resizeRect, translatePoint } from '../utils/geometry'

/** Клон списка фигур для снимков истории (поверхностные копии фигур). */
const cloneShapes = (list: Shape[]): Shape[] => list.map((shape) => ({ ...shape }))

/** Максимальная глубина истории undo/redo. */
const HISTORY_LIMIT = 50

/**
 * СОСТОЯНИЕ ФИГУР: список фигур на канвасе, создание перетаскиванием мыши
 * (инструменты «прямоугольник» и «эллипс»), изменение, выделение,
 * история изменений (Ctrl+Z / Ctrl+Shift+Z) и масштабирование колесом.
 *
 * Хук ничего не знает про DOM: Canvas передаёт ему координаты курсора,
 * уже переведённые из экранных в координаты канваса (screenToCanvas).
 */
export function useShapes() {
  const [shapes, setShapes] = useState<Shape[]>([])

  /** Актуальный список фигур для колбэков без зависимостей. */
  const shapesRef = useRef<Shape[]>([])
  shapesRef.current = shapes

  // --- История изменений (Undo / Redo) -----------------------------------

  /** Снимки прошлых и будущих состояний списка фигур. */
  const pastRef = useRef<Shape[][]>([])
  const futureRef = useRef<Shape[][]>([])

  /** Время последней записи в историю — для «склейки» жестов колесом. */
  const lastHistoryAtRef = useRef(0)

  /**
   * Сохранить снимок текущего состояния ПЕРЕД изменением.
   * Всё, что меняет фигуры, должно сначала вызвать этот метод.
   */
  const pushHistory = useCallback(() => {
    pastRef.current = [...pastRef.current, cloneShapes(shapesRef.current)]
    if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift()
    // Новая ветка действий обнуляет «вернуть».
    futureRef.current = []
    lastHistoryAtRef.current = Date.now()
  }, [])

  /**
   * Как pushHistory, но склеивает быстрые повторные вызовы: серия тиков
   * колеса с Shift за 500 мс записывается в историю одним шагом.
   */
  const pushHistoryCoalesced = useCallback(() => {
    if (Date.now() - lastHistoryAtRef.current > 500) pushHistory()
  }, [pushHistory])

  /** Ctrl+Z: откат к предыдущему снимку. */
  const undo = useCallback(() => {
    const previous = pastRef.current.pop()
    if (!previous) return
    futureRef.current = [...futureRef.current, cloneShapes(shapesRef.current)]
    setShapes(previous)
    lastHistoryAtRef.current = 0
  }, [])

  /** Ctrl+Shift+Z: вернуть отменённое состояние. */
  const redo = useCallback(() => {
    const next = futureRef.current.pop()
    if (!next) return
    pastRef.current = [...pastRef.current, cloneShapes(shapesRef.current)]
    setShapes(next)
    lastHistoryAtRef.current = 0
  }, [])

  /** Флаг «жест уже записан в историю» — чтобы перетаскивание/ресайз
   *  оставляли в истории ровно один шаг, а не запись на каждый mousemove. */
  const gestureHistoryPushed = useRef(false)


  /** Рисуемая сейчас фигура (от момента mousedown до mouseup). */
  const [draft, setDraft] = useState<Shape | null>(null)

  /** Начальная точка протягивания в координатах канваса. */
  const draftStart = useRef<Point | null>(null)

  /**
   * Состояние перетаскивания существующей фигуры:
   * id фигуры и её позиция на момент начала переноса (в координатах канваса).
   */
  const dragState = useRef<{
    id: string
    /** Позиция фигуры на момент начала переноса. */
    origin: Point
    /** Позиция курсора на момент начала переноса. */
    start: Point
  } | null>(null)

  /** Цвет по умолчанию для новых фигур (меняется из панели свойств). */
  const [currentColor, setCurrentColor] = useState('#0ea5e9')

  /**
   * Начать рисование в точке канваса (x, y).
   * Создаём фигуру минимального размера и дальше только меняем её размер.
   */
  const startDrawing = useCallback(
    (kind: Shape['kind'], x: number, y: number) => {
      draftStart.current = { x, y }
      setDraft({
        id: crypto.randomUUID(),
        kind,
        x,
        y,
        width: 0,
        height: 0,
        color: currentColor,
        selected: true,
      })
    },
    [currentColor],
  )

  /** Обновить размер рисуемой фигуры до текущей точки канваса. */
  const updateDrawing = useCallback((x: number, y: number) => {
    const start = draftStart.current
    if (!start) return
    setDraft((d) => {
      if (!d) return d
      return {
        ...d,
        // Протягивание в любую сторону: берём левый верхний угол и модуль размера.
        x: Math.min(start.x, x),
        y: Math.min(start.y, y),
        width: Math.abs(x - start.x),
        height: Math.abs(y - start.y),
      }
    })
  }, [])

  /**
   * Закончить рисование. Фигура попадает в список только если её размер
   * не меньше MIN_SHAPE_SIZE (иначе это был клик, а не протягивание).
   * Апдейтеры независимые и чистые — StrictMode вызывает их дважды.
   */
  const endDrawing = useCallback(() => {
    draftStart.current = null
    if (!draft) return
    if (draft.width >= MIN_SHAPE_SIZE && draft.height >= MIN_SHAPE_SIZE) {
      // Снимок ДО добавления: одно рисование = один шаг истории.
      // Вне апдейтера, чтобы StrictMode (двойной вызов апдейтеров)
      // не задваивал запись.
      pushHistory()
      gestureHistoryPushed.current = false
      setShapes((prev) => [...prev, { ...draft, selected: true }])
    }
    setDraft(null)
  }, [draft, pushHistory])

  /** Прервать рисование (например, при уходе мыши с канваса). */
  const cancelDrawing = useCallback(() => setDraft(null), [])

  // --- Перетаскивание выделенной фигуры ---------------------------------

  /**
   * Начать перетаскивание фигуры с id в точке канваса (x, y).
   * Запоминаем: где была фигура (origin) и где был курсор (start) —
   * дальше на каждый mousemove двигаем фигуру на дельту курсора
   * относительно start (фигура «не прыгает» под курсор).
   */
  const startDragging = useCallback((id: string, x: number, y: number) => {
    const shape = shapesRef.current.find((s) => s.id === id)
    if (!shape) return
    pushHistory() // один жест = один шаг истории
    gestureHistoryPushed.current = true
    dragState.current = {
      id: shape.id,
      origin: { x: shape.x, y: shape.y },
      start: { x, y },
    }
  }, [pushHistory])

  /** Продолжить перетаскивание: сдвигаем фигуру на дельту курсора в канвасе. */
  const moveDragging = useCallback((x: number, y: number) => {
    const state = dragState.current
    if (!state) return
    // Координаты через geometry: исходная позиция + смещение курсора.
    const next = translatePoint(state.origin, x - state.start.x, y - state.start.y)
    setShapes((prev) =>
      prev.map((shape) =>
        shape.id === state.id ? { ...shape, ...next } : shape,
      ),
    )
  }, [])

  /** Закончить перетаскивание (отпустили кнопку мыши). */
  const endDragging = useCallback(() => {
    dragState.current = null
  }, [])

  /** Прервать перетаскивание (например, при уходе мыши с канваса). */
  const cancelDragging = useCallback(() => {
    dragState.current = null
  }, [])

  /**
   * Состояние изменения размера за маркер:
   * id фигуры, какой маркер тянем, исходный габарит фигуры
   * и точка курсора на момент старта.
   */
  const resizeState = useRef<{
    id: string
    handle: HandleId
    origin: Rect
    start: Point
  } | null>(null)

  /** Начать изменение размера фигуры за маркер в точке канваса (x, y). */
  const startResizing = useCallback(
    (id: string, handle: HandleId, x: number, y: number) => {
      const shape = shapesRef.current.find((s) => s.id === id)
      if (!shape) return
      pushHistory() // один жест = один шаг истории
      gestureHistoryPushed.current = true
      resizeState.current = {
        id: shape.id,
        handle,
        origin: { x: shape.x, y: shape.y, width: shape.width, height: shape.height },
        start: { x, y },
      }
    },
    [pushHistory],
  )

  /** Продолжить изменение размера: пересчитываем габарит по дельте курсора. */
  const moveResizing = useCallback((x: number, y: number) => {
    const state = resizeState.current
    if (!state) return
    // Математика габаритов — в geometry: чистая функция от исходного Rect.
    const next = resizeRect(
      state.origin,
      state.handle,
      x - state.start.x,
      y - state.start.y,
      MIN_SHAPE_SIZE,
    )
    setShapes((prev) =>
      prev.map((shape) =>
        shape.id === state.id ? { ...shape, ...next } : shape,
      ),
    )
  }, [])

  /** Закончить изменение размера (отпустили кнопку мыши). */
  const endResizing = useCallback(() => {
    resizeState.current = null
  }, [])

  /** Прервать изменение размера (например, при уходе мыши с канваса). */
  const cancelResizing = useCallback(() => {
    resizeState.current = null
  }, [])

  /** Добавить фигуру в конец списка (сверху остальных). */
  const addShape = useCallback((shape: Shape) => {
    pushHistory()
    gestureHistoryPushed.current = false
    setShapes((prev) => [...prev, shape])
  }, [pushHistory])

  /** Изменить поля фигуры по id (позиция, размер, цвет и т.д.). */
  const updateShape = useCallback((id: string, patch: Partial<Shape>) => {
    // Панель свойств вызывает updateShape при изменении цвета/полей;
    // каждое такое изменение — отдельный шаг истории.
    pushHistory()
    gestureHistoryPushed.current = false
    setShapes((prev) =>
      prev.map((shape) => (shape.id === id ? { ...shape, ...patch } : shape)),
    )
  }, [pushHistory])

  /** Удалить все выделенные фигуры (Delete). */
  const deleteSelected = useCallback(() => {
    if (!shapesRef.current.some((shape) => shape.selected)) return
    pushHistory()
    gestureHistoryPushed.current = false
    setShapes((prev) => prev.filter((shape) => !shape.selected))
  }, [pushHistory])

  /** Выделить одну фигуру (остальные снимаем). */
  const selectShape = useCallback((id: string | null) => {
    setShapes((prev) =>
      prev.map((shape) => ({ ...shape, selected: shape.id === id })),
    )
  }, [])

  /**
   * Масштабирование выделенной фигуры колесом мыши с зажатым Shift.
   * Работает и для фигур, и для загруженных изображений.
   * Колесо «вверх» (deltaY < 0) — увеличить, «вниз» — уменьшить.
   * Серия тиков колеса записывается в историю одним шагом.
   */
  const scaleSelected = useCallback((direction: 1 | -1) => {
    const selected = shapesRef.current.find((shape) => shape.selected)
    if (!selected) return

    const factor = direction > 0 ? 1.1 : 1 / 1.1
    const width = Math.max(MIN_SHAPE_SIZE, selected.width * factor)
    const height = Math.max(MIN_SHAPE_SIZE, selected.height * factor)

    // Растём/уменьшаемся вокруг центра фигуры.
    const centerX = selected.x + selected.width / 2
    const centerY = selected.y + selected.height / 2

    pushHistoryCoalesced()
    setShapes((prev) =>
      prev.map((shape) =>
        shape.id === selected.id
          ? {
              ...shape,
              width,
              height,
              x: centerX - width / 2,
              y: centerY - height / 2,
            }
          : shape,
      ),
    )
  }, [pushHistoryCoalesced])

  /** Габариты фигуры; гарантия, что ширина/высота ≥ MIN_SHAPE_SIZE. */
  const normalizedSize = useCallback((width: number, height: number) => {
    return {
      width: Math.max(MIN_SHAPE_SIZE, width),
      height: Math.max(MIN_SHAPE_SIZE, height),
    }
  }, [])

  return {
    shapes,
    draft,
    currentColor,
    setCurrentColor,
    startDrawing,
    updateDrawing,
    endDrawing,
    cancelDrawing,
    addShape,
    updateShape,
    deleteSelected,
    selectShape,
    scaleSelected,
    undo,
    redo,
    startDragging,
    moveDragging,
    endDragging,
    cancelDragging,
    startResizing,
    moveResizing,
    endResizing,
    cancelResizing,
    normalizedSize,
  }
}
