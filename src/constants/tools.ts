import type { Tool } from '../types/shape'

/**
 * Описание одного инструмента: идентификатор, подпись в тулбаре
 * и клавиша быстрого доступа (как в Figma: V/R/O).
 * Иконка — путь SVG (viewBox 24×24), чтобы Toolbar не дублировал данные.
 */
export interface ToolDefinition {
  id: Tool
  label: string
  key: string
  /** SVG-путь иконки (viewBox 24×24). */
  iconPath: string
  /** true — иконка заливается цветом; false — рисуется контуром. */
  iconFilled?: boolean
}

/**
 * Список инструментов и горячие клавиши.
 * Хотим поменять клавишу, иконку или добавить инструмент — правим только этот файл.
 */
export const TOOLS: ToolDefinition[] = [
  {
    id: 'select',
    label: 'Выделение',
    key: 'v',
    // Стрелка-курсор (заливка), как в Figma.
    iconPath:
      'M4.037 3.479a.5.5 0 0 1 .623-.623l16.084 5.355a.5.5 0 0 1 .028.947l-6.234 2.208a2 2 0 0 0-1.24 1.24l-2.208 6.234a.5.5 0 0 1-.947.028L4.037 3.479Z',
    iconFilled: true,
  },
  {
    id: 'rectangle',
    label: 'Прямоугольник',
    key: 'r',
    // Контурный квадрат со слегка скруглёнными углами.
    iconPath:
      'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z',
  },
  {
    id: 'ellipse',
    label: 'Эллипс',
    key: 'o',
    // Контурный круг: две дуги радиуса 8 вокруг центра (12, 12).
    iconPath: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z',
  },
]

/** Границы зума: от 10% до 400%. */
export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 4

/** Размер клетки фонового хода (в единицах канваса, до зума). */
export const GRID_SIZE = 32

/** Минимальные размеры фигуры при протягивании. */
export const MIN_SHAPE_SIZE = 4

/** Цвет заливки новых фигур по умолчанию. */
export const DEFAULT_SHAPE_COLOR = '#0ea5e9'
