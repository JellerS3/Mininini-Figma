import type { useShapes } from '../hooks/useShapes'
import type { Shape } from '../types/shape'

/** Тип возвращаемого значения хука useShapes (shared state). */
type ShapesApi = ReturnType<typeof useShapes>

/**
 * ПАНЕЛЬ СВОЙСТВ справа: цвет выделенной фигуры (палитра, color input,
 * ручной ввод hex). Если ничего не выделено — задаёт цвет новых фигур.
 */
export default function PropertiesPanel({ shapesApi }: { shapesApi: ShapesApi }) {
  const { shapes, updateShape, currentColor, setCurrentColor } = shapesApi
  const selected = shapes.find((shape) => shape.selected) ?? null

  /** Смена цвета: выделенной фигуре, а заодно и по умолчанию для новых. */
  const handleColorChange = (color: string) => {
    if (selected) updateShape(selected.id, { color })
    setCurrentColor(color)
  }

  return (
    <aside className="w-56 border-l border-neutral-800 bg-neutral-950 p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Свойства
      </h2>

      {selected ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neutral-400">{shapeLabel(selected)}</p>

          {selected.kind === 'image' ? (
            // У изображения нет заливки — вместо палитры показываем размеры.
            <p className="text-xs text-neutral-500">
              {Math.round(selected.width)} × {Math.round(selected.height)} px.
              Размер и положение меняются мышью на канвасе.
            </p>
          ) : (
            <>
              <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500">Заливка</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selected.color}
                onChange={(e) => handleColorChange(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded border border-neutral-700 bg-transparent p-0.5"
              />
              <input
                type="text"
                value={selected.color}
                onChange={(e) => {
                  // Разрешаем незавершённый ввод: #, #0, #0a, #0ab...
                  const value = e.target.value
                  if (/^#[0-9a-fA-F]{0,6}$/.test(value)) handleColorChange(value)
                }}
                className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-200 outline-none focus:border-sky-500"
              />
            </div>
          </label>

          <div className="flex gap-1.5">
            {SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                onClick={() => handleColorChange(color)}
                className={
                  'h-6 w-6 rounded border transition-transform hover:scale-110 ' +
                  (selected.color.toLowerCase() === color.toLowerCase()
                    ? 'border-sky-400'
                    : 'border-neutral-700')
                }
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
            </>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-neutral-600">Нет выделения</p>
          <label className="mt-3 flex items-center gap-2">
            <span className="text-xs text-neutral-500">Цвет новых фигур</span>
            <input
              type="color"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded border border-neutral-700 bg-transparent p-0.5"
            />
          </label>
        </>
      )}
    </aside>
  )
}

/** Быстрая палитра. */
const SWATCHES = ['#0ea5e9', '#22c55e', '#eab308', '#ef4444', '#a855f7', '#f8fafc']

/** Человекочитаемое название типа фигуры (как в панели слоёв). */
function shapeLabel(shape: Shape): string {
  if (shape.kind === 'rectangle') return 'Прямоугольник'
  if (shape.kind === 'ellipse') return 'Эллипс'
  return 'Изображение'
}
