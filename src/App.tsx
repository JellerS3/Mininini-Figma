import { useCallback, useState } from 'react'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import PropertiesPanel from './components/PropertiesPanel'
import LayersPanel from './components/LayersPanel'
import ImageUploadPanel from './components/ImageUploadPanel'
import { useShapes } from './hooks/useShapes'
import type { Tool } from './types/shape'

/**
 * СБОРКА ИНТЕРФЕЙСА: холст в центре, тулбар слева,
 * слои и свойства справа. Логика — в хуках, математика — в utils.
 *
 * Состояние фигур создаётся здесь ОДИН раз (useShapes) и передаётся
 * и в Canvas, и в PropertiesPanel — иначе у панелей были бы
 * независимые копии списка фигур.
 */
export default function App() {
  const [activeTool, setActiveTool] = useState<Tool>('select')

  // Единственный экземпляр состояния фигур на всё приложение.
  const shapesApi = useShapes()

  const handleSelectTool = useCallback((tool: Tool) => {
    setActiveTool(tool)
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-900 text-neutral-200">
      <Toolbar activeTool={activeTool} onSelectTool={handleSelectTool} />
      <div className="relative flex-1">
        <Canvas
          activeTool={activeTool}
          shapesApi={shapesApi}
          onActivateTool={handleSelectTool}
        />
      </div>
      <div className="flex flex-col">
        <LayersPanel shapesApi={shapesApi} />
        <PropertiesPanel shapesApi={shapesApi} />
        <ImageUploadPanel shapesApi={shapesApi} />
      </div>
    </div>
  )
}
