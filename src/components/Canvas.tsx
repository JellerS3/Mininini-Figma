import { useEffect, useRef } from 'react'
import { useViewport } from '../hooks/useViewport'
import { useHotkeys } from '../hooks/useHotkeys'
import type { useShapes } from '../hooks/useShapes'
import Shape from './Shape'
import { GRID_SIZE } from '../constants/tools'
import { screenToCanvas, isPointInShape } from '../utils/geometry'
import type { Tool } from '../types/shape'
/** Тип возвращаемого значения хука useShapes (shared state). */
type ShapesApi = ReturnType<typeof useShapes>

/**
 * ХОЛСТ на весь экран.
 * Отвечает за: фоновую сетку, обработку мыши (пан на пробеле/средней кнопке),
 * зум колесом, рисование фигур инструментами «прямоугольник»/«эллипс»
 * и рендер фигур.
 */
export default function Canvas({
  activeTool,
  shapesApi,
  onActivateTool,
}: {
  activeTool: Tool
  shapesApi: ShapesApi
  /** Смена инструмента (для горячих клавиш V/R/O). */
  onActivateTool: (tool: Tool) => void
}) {
  const canvasRef = useRef<HTMLDivElement>(null)

  // Камера: пан + зум.
  const {
    viewport,
    isPanningAvailable,
    startPan,
    movePan,
    endPan,
    centerOnPoint,
  } = useViewport(canvasRef)

  // Общее состояние фигур (создано в App, используется и панелями).
  const {
    shapes,
    draft,
    startDrawing,
    updateDrawing,
    endDrawing,
    selectShape,
    deleteSelected,
    scaleSelected,
    undo,
    redo,
    startDragging,
    moveDragging,
    endDragging,
    startResizing,
    moveResizing,
    endResizing,
  } = shapesApi

  // Горячие клавиши: V/R/O, Delete, Ctrl+Z / Ctrl+Shift+Z.
  // Активный инструмент меняем через setActiveTool (передан из App).
  useHotkeys({
    onSelectTool: onActivateTool,
    onDeleteSelected: deleteSelected,
    onUndo: undo,
    onRedo: redo,
  })

  // Shift + колесо мыши: масштабирование выделенной фигуры/изображения.
  // Вешаем напрямую (не onWheel), чтобы preventDefault() работал —
  // иначе страница попытается проскроллиться.
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey) {
        e.preventDefault()
        // Колесо вверх (deltaY < 0) — увеличить, вниз — уменьшить.
        scaleSelected(e.deltaY < 0 ? 1 : -1)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [canvasRef, scaleSelected])

  // Центрирование камеры при старте: начало координат — в центре окна.
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    centerOnPoint(rect.width / 2, rect.height / 2)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Обработчики мыши -------------------------------------------------

  /** Экранные координаты мыши → координаты канваса (с учётом зума и пана). */
  const toCanvasPoint = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null
    return screenToCanvas(e.clientX - rect.left, e.clientY - rect.top, viewport)
  }

  const onMouseDown = (e: React.MouseEvent) => {
    // Пан: пробел + левая кнопка ИЛИ средняя кнопка.
    if ((isPanningAvailable && e.button === 0) || e.button === 1) {
      e.preventDefault()
      startPan(e.clientX, e.clientY)
      return
    }

    // Рисование: левая кнопка с активным инструментом фигуры.
    if (e.button === 0 && (activeTool === 'rectangle' || activeTool === 'ellipse')) {
      const point = toCanvasPoint(e)
      if (point) startDrawing(activeTool, point.x, point.y)
      return
    }

    // Выделение / начало перетаскивания: инструмент «выделение».
    if (e.button === 0 && activeTool === 'select') {
      const point = toCanvasPoint(e)
      if (!point) return

      // Кликнули по фигуре? Берём верхнюю (последнюю в списке) под курсором.
      const clicked = [...shapes]
        .reverse()
        .find((shape) => isPointInShape(shape, point.x, point.y))

      if (clicked) {
        // Выделяем фигуру и запоминаем, откуда начнём её тащить.
        selectShape(clicked.id)
        startDragging(clicked.id, point.x, point.y)
      } else {
        // Клик по пустому месту снимает выделение.
        selectShape(null)
      }
    }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (isPanningAvailable) {
      movePan(e.clientX, e.clientY)
      return
    }
    if (draft) {
      const point = toCanvasPoint(e)
      if (point) updateDrawing(point.x, point.y)
      return
    }
    // Перетаскивание и изменение размера выделенной фигуры
    // (если ничего не начато — оба no-op).
    const point = toCanvasPoint(e)
    if (point) {
      moveResizing(point.x, point.y)
      moveDragging(point.x, point.y)
    }
  }

  const onMouseUp = () => {
    endPan()
    endDrawing()
    endDragging()
    endResizing()
  }

  // --- Рендер ------------------------------------------------------------

  return (
    <div
      ref={canvasRef}
      className="relative h-full w-full overflow-hidden bg-neutral-900 select-none"
      style={{
        cursor: isPanningAvailable
          ? 'grab'
          : activeTool === 'select'
            ? 'default'
            : 'crosshair',
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Сетка: два линейных градиента — вертикальные и горизонтальные линии.
          Сдвиг фона на panX/panY и масштаб через background-size дают сетке
          «прилипать» к канвасу при панорамировании и зуме. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), ' +
            'linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: `${GRID_SIZE * viewport.zoom}px ${GRID_SIZE * viewport.zoom}px`,
          backgroundPosition: `${viewport.panX}px ${viewport.panY}px`,
        }}
      />

      {/* Слой фигур: координаты канваса → экранные через zoom/pan. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {shapes.map((shape) => (
          <Shape
            key={shape.id}
            shape={shape}
            // Ручки маркеров активны только в режиме выделения (без пана):
            // иначе они мешали бы рисованию и панорамированию.
            interactive={activeTool === 'select' && !isPanningAvailable}
            onResizeStart={(handle, e) => {
              const point = toCanvasPoint(e)
              if (point) startResizing(shape.id, handle, point.x, point.y)
            }}
          />
        ))}

        {/* Фигура, которую рисуют прямо сейчас. В том же слое —
            масштабируется вместе с канвасом, как и остальные. */}
        {draft && <Shape shape={draft} />}
      </div>
    </div>
  )
}
