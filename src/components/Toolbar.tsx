import { TOOLS } from '../constants/tools'
import type { Tool } from '../types/shape'

/**
 * ПАНЕЛЬ ИНСТРУМЕНТОВ слева: выделение (курсор), прямоугольник (квадрат),
 * эллипс (круг). Иконки — SVG-пути из constants/tools; активный
 * инструмент подсвечен.
 */
export default function Toolbar({
  activeTool,
  onSelectTool,
}: {
  activeTool: Tool
  onSelectTool: (tool: Tool) => void
}) {
  return (
    <aside className="flex w-12 flex-col items-center gap-1 border-r border-neutral-800 bg-neutral-950 py-3">
      {TOOLS.map((tool) => {
        const isActive = tool.id === activeTool
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => onSelectTool(tool.id)}
            title={`${tool.label} (${tool.key.toUpperCase()})`}
            className={
              'flex h-8 w-8 items-center justify-center rounded transition-colors ' +
              (isActive
                ? 'bg-sky-600 text-white'
                : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200')
            }
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path
                d={tool.iconPath}
                fill={tool.iconFilled ? 'currentColor' : 'none'}
                stroke={tool.iconFilled ? 'none' : 'currentColor'}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )
      })}
    </aside>
  )
}
