import { useRef, useState } from 'react'
import type { useShapes } from '../hooks/useShapes'
import { MIN_SHAPE_SIZE } from '../constants/tools'
import type { Shape } from '../types/shape'

/** Тип возвращаемого значения хука useShapes (shared state). */
type ShapesApi = ReturnType<typeof useShapes>

/** Максимальная сторона добавленного изображения (в координатах канваса). */
const MAX_IMAGE_SIDE = 320

/**
 * ПАНЕЛЬ «ЗАГРУЗИТЬ ИЗОБРАЖЕНИЕ» внизу правой колонки.
 * Выбираем файл → читаем как data URL → считаем пропорциональный
 * размер → добавляем на канвас фигуру kind='image' и выделяем её.
 * Дальше изображение ведёт себя как обычная фигура:
 * выделяется, перетаскивается и меняет размер за маркеры.
 */
export default function ImageUploadPanel({ shapesApi }: { shapesApi: ShapesApi }) {
  const { shapes, addShape, selectShape } = shapesApi
  const inputRef = useRef<HTMLInputElement>(null)
  const [isBusy, setIsBusy] = useState(false)

  const handleFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    setIsBusy(true)

    const reader = new FileReader()
    reader.onload = () => {
      const src = String(reader.result)

      // Размер в координатах канваса узнаём из натуральных размеров файла.
      const image = new Image()
      image.onload = () => {
        // Вписываем в MAX_IMAGE_SIDE с сохранением пропорций,
        // но не меньше MIN_SHAPE_SIZE (иначе фигуру не выделить/не схватить).
        const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight))
        const width = Math.max(MIN_SHAPE_SIZE, image.naturalWidth * scale)
        const height = Math.max(MIN_SHAPE_SIZE, image.naturalHeight * scale)

        // Каскад: несколько загрузок не ложатся точно друг на друга.
        const offset = (shapes.length % 8) * 24

        const shape: Shape = {
          id: crypto.randomUUID(),
          kind: 'image',
          x: offset,
          y: offset,
          width,
          height,
          color: 'transparent',
          src,
          selected: true,
        }
        addShape(shape)
        // Снимаем выделение с остальных — выделено только новое изображение.
        selectShape(shape.id)

        setIsBusy(false)
        // Позволяем загрузить тот же файл повторно.
        if (inputRef.current) inputRef.current.value = ''
      }
      image.onerror = () => setIsBusy(false)
      image.src = src
    }
    reader.onerror = () => setIsBusy(false)
    reader.readAsDataURL(file)
  }

  return (
    <aside className="mt-auto w-56 border-l border-t border-neutral-800 bg-neutral-950 p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Изображения
      </h2>

      {/* Скрытый input + стилизованная кнопка: клик открывает выбор файла */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={isBusy}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded border border-neutral-700 bg-neutral-900 px-2 py-2 text-sm text-neutral-200 transition-colors hover:border-sky-500 hover:bg-neutral-800 disabled:opacity-50"
      >
        {/* Иконка «картинка» (viewBox 24×24) */}
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="M5 18l5-5 3 3 4-4 2 2" />
        </svg>
        {isBusy ? 'Загружаю…' : 'Загрузить изображение'}
      </button>

      <p className="mt-2 text-xs text-neutral-600">
        PNG, JPG, SVG… Файл появится на канвасе как слой.
      </p>
    </aside>
  )
}
