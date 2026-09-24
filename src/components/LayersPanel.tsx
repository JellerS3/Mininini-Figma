import type { useShapes } from '../hooks/useShapes'
import type { Shape } from '../types/shape'

/** Тип возвращаемого значения хука useShapes (shared state). */
type ShapesApi = ReturnType<typeof useShapes>

/**
 * ПАНЕЛЬ СЛОЁВ справа: список всех фигур на канвасе.
 * Слои показываются сверху вниз «как в Figma»: верхний слой фигуры
 * (последняя созданная) — в начале списка.
 * Клик по слою выделяет фигуру на канвасе, у выделенного слоя — подсветка.
 */
export default function LayersPanel({ shapesApi }: { shapesApi: ShapesApi }) {
  const { shapes, selectShape } = shapesApi

  // Реверс: последняя фигура в массиве — верхняя на канвасе — первая в списке.
  const layers = [...shapes].reverse()

  return (
    <aside className="w-56 border-l border-neutral-800 bg-neutral-950 p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Слои
      </h2>

      {layers.length === 0 ? (
        <p className="text-sm text-neutral-600">Пусто</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {layers.map((shape) => (
            <LayerRow
              key={shape.id}
              shape={shape}
              onSelect={() => selectShape(shape.id)}
            />
          ))}
        </ul>
      )}
    </aside>
  )
}

/** Одна строка списка слоёв: цветовая метка, название, подсветка выделения. */
function LayerRow({ shape, onSelect }: { shape: Shape; onSelect: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={
          'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ' +
          (shape.selected
            ? 'bg-sky-500/15 text-sky-300'
            : 'text-neutral-300 hover:bg-neutral-800/70')
        }
      >
        {/* Цветовой маркер слоя; у изображения — миниатюра файла */}
        <span
          className={
            'h-3.5 w-3.5 shrink-0 rounded-sm border border-neutral-700 ' +
            (shape.kind === 'ellipse' ? 'rounded-full' : '')
          }
          style={
            shape.kind === 'image' && shape.src
              ? {
                  backgroundImage: `url(${shape.src})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : { backgroundColor: shape.color }
          }
        />
        <span className="truncate">{shapeLabel(shape)}</span>
      </button>
    </li>
  )
}

/** Человекочитаемое название слоя по типу фигуры. */
function shapeLabel(shape: Shape): string {
  if (shape.kind === 'rectangle') return 'Прямоугольник'
  if (shape.kind === 'ellipse') return 'Эллипс'
  return 'Изображение'
}
