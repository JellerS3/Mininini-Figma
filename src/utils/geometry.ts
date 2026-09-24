import type { HandleId, Point, Rect, Shape } from '../types/shape'
import { MIN_ZOOM, MAX_ZOOM } from '../constants/tools'

/**
 * Вьюпорт (камера) описывает, какой участок канваса мы видим.
 * zoom  — масштаб (1 = 100%),
 * panX / panY — сдвиг канваса в экранных пикселях.
 */
export interface Viewport {
  zoom: number
  panX: number
  panY: number
}

/**
 * Переводит ЭКРАННУЮ точку (например, позицию мыши относительно DOM-элемента)
 * в КООРДИНАТЫ КАНВАСА с учётом зума и панорамирования.
 *
 * Без этого пересчёта фигуры «уезжают» относительно курсора
 * при изменении зума и сдвиге холста.
 */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  viewport: Viewport,
): Point {
  return {
    x: (screenX - viewport.panX) / viewport.zoom,
    y: (screenY - viewport.panY) / viewport.zoom,
  }
}

/**
 * Сдвигает точку на (dx, dy) и возвращает НОВУЮ точку.
 * Используется при перетаскивании: к исходной позиции фигуры
 * прибавляется смещение курсора в координатах канваса.
 */
export function translatePoint(point: Point, dx: number, dy: number): Point {
  return { x: point.x + dx, y: point.y + dy }
}

/** Обратное преобразование: координаты канваса → экран. */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  viewport: Viewport,
): Point {
  return {
    x: canvasX * viewport.zoom + viewport.panX,
    y: canvasY * viewport.zoom + viewport.panY,
  }
}

/**
 * Зум колесом мыши: точка под курсором должна остаться на месте.
 * factor — во сколько раз умножается зум (например 1.1 или 1/1.1).
 */
export function zoomAt(
  viewport: Viewport,
  factor: number,
  screenX: number,
  screenY: number,
): Viewport {
  const zoom = clamp(viewport.zoom * factor, MIN_ZOOM, MAX_ZOOM)
  // Фактический множитель с учётом возможного упора в границу зума.
  const realFactor = zoom / viewport.zoom

  // Формула: чтобы точка под курсором не двигалась,
  // пан нужно сдвинуть так, что screen = canvas * zoom + pan сохранялось.
  const panX = screenX - (screenX - viewport.panX) * realFactor
  const panY = screenY - (screenY - viewport.panY) * realFactor

  return { zoom, panX, panY }
}

/** Ограничение числа диапазоном. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Изменение размера прямоугольной области за маркер.
 * Противоположная маркеру сторона остаётся на месте; при выходе
 * за минимум размер «упирается» в minSize, а не уходит в минус.
 * Для серединных маркеров (n/s/w/e) меняется только одна сторона.
 */
export function resizeRect(
  rect: Rect,
  handle: HandleId,
  dx: number,
  dy: number,
  minSize: number,
): Rect {
  let { x, y, width, height } = rect
  const right = x + width
  const bottom = y + height

  // Горизонталь: маркеры с 'w' тянут левую сторону, с 'e' — правую.
  if (handle.includes('w')) {
    const newLeft = Math.min(x + dx, right - minSize)
    width = right - newLeft
    x = newLeft
  } else if (handle.includes('e')) {
    width = Math.max(minSize, width + dx)
  }

  // Вертикаль: маркеры с 'n' тянут верхнюю сторону, с 's' — нижнюю.
  if (handle.includes('n')) {
    const newTop = Math.min(y + dy, bottom - minSize)
    height = bottom - newTop
    y = newTop
  } else if (handle.includes('s')) {
    height = Math.max(minSize, height + dy)
  }

  return { x, y, width, height }
}

/**
 * Проверка попадания точки канваса в фигуру (hit-test).
 * Для прямоугольника — простая проверка AABB; для эллипса —
 * уравнение эллипса: ((x-cx)/rx)^2 + ((y-cy)/ry)^2 <= 1.
 * Возвращает true, если точка (x, y) лежит внутри фигуры.
 */
export function isPointInShape(
  shape: Shape,
  x: number,
  y: number,
): boolean {
  if (shape.kind === 'rectangle' || shape.kind === 'image') {
    return (
      x >= shape.x &&
      x <= shape.x + shape.width &&
      y >= shape.y &&
      y <= shape.y + shape.height
    )
  }

  // Эллипс: центр и радиусы.
  const cx = shape.x + shape.width / 2
  const cy = shape.y + shape.height / 2
  const rx = shape.width / 2
  const ry = shape.height / 2
  if (rx === 0 || ry === 0) return false

  const dx = (x - cx) / rx
  const dy = (y - cy) / ry
  return dx * dx + dy * dy <= 1
}
