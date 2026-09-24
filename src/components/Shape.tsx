import type { MouseEvent as ReactMouseEvent } from 'react'
import type { HandleId, Shape as ShapeModel } from '../types/shape'

/** Толщина рамки выделения в координатах канваса. */
const BORDER_WIDTH = 1.5
/** Размер углового маркера в координатах канваса. */
const HANDLE_SIZE = 8
/** Смещение маркера, чтобы он был отцентрован на границе. */
const HANDLE_OFFSET = HANDLE_SIZE / 2

export interface ShapeProps {
  shape: ShapeModel
  /**
   * Разрешено ли взаимодействие с маркерами (инструмент «выделение»
   * и нет пана). В остальных случаях маркеры не перехватывают мышь,
   * чтобы не мешать рисованию и панорамированию.
   */
  interactive?: boolean
  /** Начать изменение размера за маркер (координаты пересчитает Canvas). */
  onResizeStart?: (handle: HandleId, e: ReactMouseEvent) => void
}

/**
 * Рендер ОДНОЙ фигуры в координатах канваса.
 * Слой, в котором лежат фигуры, уже отмасштабирован через transform,
 * поэтому размеры здесь — в единицах канваса (не экрана):
 * фигуры автоматически масштабируются вместе с канвасом.
 *
 * Выделенная фигура получает рамку и 8 маркеров (4 угла + 4 середины
 * сторон), как в Figma. Маркеры — живые ручки: mousedown по ним
 * начинает изменение размера (логика в useShapes, математика в geometry).
 * Рамка и маркеры живут в координатах канваса, поэтому масштабируются
 * вместе с ней при зуме и панорамировании.
 */
export default function Shape({
  shape,
  interactive = false,
  onResizeStart,
}: ShapeProps) {
  return (
    <div
      className={
        'absolute ' + (shape.kind === 'ellipse' ? 'rounded-full ' : '')
      }
      style={{
        left: shape.x,
        top: shape.y,
        width: shape.width,
        height: shape.height,
        backgroundColor: shape.color,
      }}
    >
      {/* Изображение: растягиваем на всю фигуру, <img> не должен тащиться сам */}
      {shape.kind === 'image' && shape.src && (
        <img
          src={shape.src}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      )}

      {shape.selected && (
        <>
          {/* Рамка выделения: рисуем снаружи фигуры, чтобы не перекрывать заливку */}
          <div
            className="pointer-events-none absolute border-sky-400"
            style={{
              left: -BORDER_WIDTH,
              top: -BORDER_WIDTH,
              width: shape.width + BORDER_WIDTH * 2,
              height: shape.height + BORDER_WIDTH * 2,
              borderWidth: BORDER_WIDTH,
              borderStyle: 'solid',
              borderRadius: shape.kind === 'ellipse' ? '50%' : 0,
            }}
          />

          {/* 8 маркеров-ручок: углы и середины сторон.
              Позиции заданы в канвас-координатах относительно фигуры. */}
          {HANDLE_POSITIONS.map(({ name, left, top, cursor }) => (
            <div
              key={name}
              className="absolute rounded-[1px] border border-sky-400 bg-white"
              style={{
                width: HANDLE_SIZE,
                height: HANDLE_SIZE,
                left: left * shape.width - HANDLE_OFFSET,
                top: top * shape.height - HANDLE_OFFSET,
                cursor,
                // Маркер ловит мышь только в режиме выделения.
                pointerEvents: interactive ? 'auto' : 'none',
              }}
              onMouseDown={
                interactive && onResizeStart
                  ? (e) => {
                      // Не даём канвасу снять выделение / начать драг.
                      e.stopPropagation()
                      onResizeStart(name, e)
                    }
                  : undefined
              }
            />
          ))}
        </>
      )}
    </div>
  )
}

/**
 * Позиции маркеров в долях размера фигуры:
 * { left: 0|0.5|1, top: 0|0.5|1 } — углы и середины сторон.
 * cursor — курсор «изменение размера», как в Figma.
 */
const HANDLE_POSITIONS: ReadonlyArray<{
  name: HandleId
  left: number
  top: number
  cursor: string
}> = [
  { name: 'nw', left: 0, top: 0, cursor: 'nwse-resize' },
  { name: 'n', left: 0.5, top: 0, cursor: 'ns-resize' },
  { name: 'ne', left: 1, top: 0, cursor: 'nesw-resize' },
  { name: 'w', left: 0, top: 0.5, cursor: 'ew-resize' },
  { name: 'e', left: 1, top: 0.5, cursor: 'ew-resize' },
  { name: 'sw', left: 0, top: 1, cursor: 'nesw-resize' },
  { name: 's', left: 0.5, top: 1, cursor: 'ns-resize' },
  { name: 'se', left: 1, top: 1, cursor: 'nwse-resize' },
]
