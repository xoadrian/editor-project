import isHotkey from 'is-hotkey'
import { KeyboardEvent } from 'react'
import { BaseSelection, Editor, Element as SlateElement, Element, InsertNodeOperation, Path, Range, Transforms } from 'slate'
import { SelectionOperation } from 'slate/dist/interfaces/operation'
import { CustomElement, CustomElementType } from './CustomElement'
import { CustomText } from './CustomLeaf'

const LIST_TYPES = ['numbered-list', 'bulleted-list']

export const toggleBlock = (editor: Editor, format: CustomElementType): void => {
  const isActive = isBlockActive(editor, format)
  const isList = LIST_TYPES.includes(format)

  Transforms.unwrapNodes(editor, {
    match: n =>
      LIST_TYPES.includes(
        !Editor.isEditor(n) && SlateElement.isElement(n) && n.type as any // eslint-disable-line @typescript-eslint/no-explicit-any
      ),
    split: true,
  })
  const newProperties: Partial<SlateElement> = {
    type: isActive ? CustomElementType.paragraph : isList ? CustomElementType.listItem : format,
  }
  Transforms.setNodes(editor, newProperties)

  if (!isActive && isList) {
    const block = { type: format, children: [] }
    Transforms.wrapNodes(editor, block)
  }
}

export const toggleMark = (editor: Editor, format: keyof CustomText): void => {
  const isActive = isMarkActive(editor, format)

  if (isActive) {
    Editor.removeMark(editor, format)
  } else {
    Editor.addMark(editor, format, true)
  }
}

export const isBlockActive = (editor: Editor, format: CustomElementType): boolean => {
  const [match] = Editor.nodes(editor, {
    match: n =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === format,
  })

  return !!match
}

export const isLinkNodeAtSelection = (editor: Editor, selection: BaseSelection): boolean => {
  if (selection == null) {
    return false;
  }

  return (
    Editor.above(editor, {
      at: selection,
      match: (n) => (n as CustomElement).type === CustomElementType.link
    }) != null
  );
}

const moveEditorCursorToTheEndOfTheLink = (editor: Editor, selection: BaseSelection, offset: number, path?: Path): void => {
  if (!selection) {
    return
  }

  setTimeout(() => {
    if (!editor.selection) {
      return
    }

    editor.apply({
      type: 'set_selection',
      newProperties: {
        anchor: {
          offset,
          path: path ?? editor.selection.anchor.path
        },
        focus: {
          offset,
          path: path ?? editor.selection.anchor.path
        },
      }
    } as SelectionOperation)
  })
}

export function toggleLinkAtSelection(editor: Editor, selection: BaseSelection): void {
  if (selection == null) {
    return
  }

  if (!isLinkNodeAtSelection(editor, selection)) {
    const isSelectionCollapsed = Range.isCollapsed(selection)

    if (isSelectionCollapsed) {
      Transforms.insertNodes(
        editor,
        {
          type: CustomElementType.link,
          href: '',
          children: [{ text: 'link' }],
        },
        { at: selection }
      );
      const linkNodeOperation = editor.operations.find(operation => operation.type === 'insert_node')
      if (linkNodeOperation) {
        moveEditorCursorToTheEndOfTheLink(editor, selection, 4, [...(linkNodeOperation as InsertNodeOperation).path, 0])
      }
    } else {
      Transforms.wrapNodes(
        editor,
        { type: CustomElementType.link, href: '', children: [{ text: '' }] },
        { split: true, at: selection }
      );
      const selectionLength = selection.focus.offset - selection.anchor.offset
      moveEditorCursorToTheEndOfTheLink(editor, selection, selectionLength)
    }
  } else {
    Transforms.unwrapNodes(editor, {
      match: (n) => Element.isElement(n) && n.type === CustomElementType.link,
    });

    // after unwrap we need to re-trigger the selection
    setTimeout(() => {
      editor.apply({
        type: 'set_selection',
        newProperties: editor.selection
      } as SelectionOperation)
    })
  }
}


export const isMarkActive = (editor: Editor, format: keyof CustomText): boolean => {
  const marks = Editor.marks(editor)
  return marks ? format in marks === true : false
}

const HOTKEYS: Record<string, keyof CustomText> = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
}

export const handleHotkeys = (editor: Editor) => (event: KeyboardEvent<HTMLDivElement>): void => {
  for (const hotkey in HOTKEYS) {
    if (isHotkey(hotkey, event)) {
      event.preventDefault()
      const mark = HOTKEYS[hotkey]
      toggleMark(editor, mark)
    }
  }
}
