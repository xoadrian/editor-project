import { useCallback, useRef, useState } from 'react'
import { BaseSelection, BaseSetSelectionOperation, Operation } from 'slate'

export const useSelectionFromOperations = (): [BaseSelection, BaseSelection, (newOperations: Operation[]) => void] => {
  const [selection, setSelection] = useState<BaseSelection>(null)
  const currentSelection = useRef<BaseSelection>(null);
  const previousSelection = useRef<BaseSelection>(null);

  const setSelectionOptimized = useCallback(
    (newOperations: Operation[]) => {
      const lastSelectionOperation = (newOperations.filter(operation => operation.type === 'set_selection') as BaseSetSelectionOperation[]).pop()

      if (!lastSelectionOperation) {
        return
      }
      previousSelection.current = lastSelectionOperation.properties as BaseSelection;
      currentSelection.current = lastSelectionOperation.newProperties as BaseSelection;
      // console.log(previousSelection.current, currentSelection.current)
      setSelection(currentSelection.current)
    },
    [selection, setSelection]
  )

  return [previousSelection.current, currentSelection.current, setSelectionOptimized]
}
