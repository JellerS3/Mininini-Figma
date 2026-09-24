/**
 * Единый язык проекта: здесь описаны сущности, которыми оперируют
 * все остальные слои (utils, hooks, components).
 */

/** Инструмент, выбранный на панели инструментов. */
export type Tool = 'select' | 'rectangle' | 'ellipse'

/**
 * Базовая фигура на холсте.
 * Прямоугольник, эллипс и изображение описаны одним типом:
 * различает их поле `kind`.
 */
export interface Shape {
  id: string
  kind: 'rectangle' | 'ellipse' | 'image'

  /** Позиция и размер в координатах канваса (не экрана!). */
  x: number
  y: number
  width: number
  height: number

  /** Цвет заливки фигуры (hex, например '#0ea5e9'). Для image не используется. */
  color: string

  /**
   * Для kind === 'image': содержимое картинки в виде data URL
   * (файл читается в панели «Загрузить изображение»).
   */
  src?: string

  /** Выделена ли фигура. */
  selected: boolean
}

/**
 * Маркер изменения размера на габаритной рамке выделенной фигуры:
 * 4 угла и 4 середины сторон (схема сторон света).
 */
export type HandleId = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se'

/**
 * Точка в координатах канваса (мировые координаты).
 * Не зависит от зума и панорамирования.
 */
export interface Point {
  x: number
  y: number
}

/** Прямоугольная область в координатах канваса. */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}
