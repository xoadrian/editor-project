import { Editor, Element, Node, Path, Range, Transforms,  } from 'slate'
import { ReactEditor } from 'slate-react'

import { CustomElement, CustomElementType } from './CustomElement'

const createLinkNode = (href: string, text: string): CustomElement => ({
  type: CustomElementType.link,
  href,
  children: [{ text }]
})

const createParagraphNode = (nodes: CustomElement[]): Node => ({
  type: CustomElementType.paragraph,
  children: nodes
})

export const removeLink = (editor: Editor, operations = {}): void => {
  Transforms.unwrapNodes(editor, {
    ...operations,
    match: (n) => !Editor.isEditor(n) && Element.isElement(n) && n.type === CustomElementType.link
  })
}

export const insertLink = (editor: Editor, url?: string | null): void => {
  if (!url) return;

  const { selection } = editor;
  const link = createLinkNode(url, 'New Link');

  ReactEditor.focus(editor);

  if (selection) {
    const [parentNode, parentPath] = Editor.parent(
      editor,
      selection.focus?.path
    );
    const parentNodeElement = parentNode as CustomElement

    // Remove the Link node if we're inserting a new link node inside of another link.
    if (parentNodeElement.type === CustomElementType.link) {
      removeLink(editor);
    }

    if (editor.isVoid(parentNodeElement)) {
      // Insert the new link after the void node
      Transforms.insertNodes(editor, createParagraphNode([link]), {
        at: Path.next(parentPath),
        select: true
      });
    } else if (Range.isCollapsed(selection)) {
      // Insert the new link in our last known location
      Transforms.insertNodes(editor, link, { select: true });
    } else {
      // Wrap the currently selected range of text into a Link
      Transforms.wrapNodes(editor, link, { split: true });
      // Remove the highlight and move the cursor to the end of the highlight
      Transforms.collapse(editor, { edge: "end" });
    }
  } else {
    // Insert the new link node at the bottom of the Editor when selection is falsy
    Transforms.insertNodes(editor, createParagraphNode([link]));
  }
}
