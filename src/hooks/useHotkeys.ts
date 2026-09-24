import { useEffect, useRef } from 'react'
import { TOOLS } from '../constants/tools'
import type { Tool } from '../types/shape'

/**
 * ГОРЯЧИЕ КЛАВИШИ (как в Figma):
 *  - V / R / O — выбор инструмента (соответствие берётся из constants/tools);
 *  - Delete / Backspace — удалить выделенные фигуры;
 *  - Ctrl+Z — отменить, Ctrl+Shift+Z (или Ctrl+Y) — вернуть.
 *
 * Клавиши инструментов сравниваются по e.code (физическая клавиша),
 * поэтому хоткеи работают на любой раскладке, включая русскую.
 *
 * Хук принимает колбэки и не знает, кто их вызывает, — так его можно
 * переиспользовать и тестировать отдельно от интерфейса.
 */
interface HotkeysHandlers {
  onSelectTool?: (toolId: Tool) => void
  onDeleteSelected?: () => void
  onUndo?: () => void
  onRedo?: () => void
}

export function useHotkeys(handlers: HotkeysHandlers = {}) {
  // Держим актуальные колбэки в ref: подписка навешивается один раз
  // и не пересоздаётся на каждый рендер (объект handlers нестабилен).
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    // В полях ввода хоткеи не работают — там печатают текст.
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false
      return (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      )
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const h = handlersRef.current
      if (isTypingTarget(e.target)) return

      // --- Undo / Redo (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y) -------------------
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault()
        if (e.shiftKey) h.onRedo?.()
        else h.onUndo?.()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        e.preventDefault()
        h.onRedo?.()
        return
      }

      // Дальше идут одиночные клавиши — модификаторы игнорируем,
      // чтобы Ctrl+R не переключал инструмент «прямоугольник».
      if (e.ctrlKey || e.metaKey || e.altKey) return

      // --- Инструменты: V / R / O (список — в constants/tools) ------------
      const tool = TOOLS.find((t) => `Key${t.key.toUpperCase()}` === e.code)
      if (tool) {
        h.onSelectTool?.(tool.id)
        return
      }

      // --- Удаление выделенных фигур ---------------------------------------
      if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault()
        h.onDeleteSelected?.()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
