import { Editor, Node, Transforms } from 'slate'
import { jsx } from 'slate-hyperscript'

import { CustomElement, CustomElementType } from '../editor/CustomElement'
import { CustomText } from '../editor/CustomLeaf'

const ELEMENT_TAGS: Record<string, (el: HTMLElement) => Pick<CustomElement, 'type' | 'href'>> = {
  // A: el => ({ type: 'link', url: el.getAttribute('href') }),
  BLOCKQUOTE: () => ({ type: CustomElementType.blockQuote }),
  H1: () => ({ type: CustomElementType.headingOne }),
  H2: () => ({ type: CustomElementType.headingTwo }),
  // H3: () => ({ type: 'heading-three' }),
  // H4: () => ({ type: 'heading-four' }),
  // H5: () => ({ type: 'heading-five' }),
  // H6: () => ({ type: 'heading-six' }),
  // IMG: el => ({ type: 'image', url: el.getAttribute('src') }),
  LI: () => ({ type: CustomElementType.listItem }),
  OL: () => ({ type: CustomElementType.numberedList }),
  P: () => ({ type: CustomElementType.paragraph }),
  // PRE: () => ({ type: 'code' }),
  UL: () => ({ type: CustomElementType.bulletedList }),
  A: (el) => { console.log({typeOfEl: typeof el}); return {
    type: CustomElementType.link, href: (el as HTMLAnchorElement).href
  }}
}

// COMPAT: `B` is omitted here because Google Docs uses `<b>` in weird ways.
const TEXT_TAGS: Record<string, (el?: HTMLElement) => Omit<CustomText, 'text'>> = {
  CODE: () => ({ code: true }),
  // DEL: () => ({ strikethrough: true }),
  EM: () => ({ italic: true }),
  I: () => ({ italic: true }),
  // S: () => ({ strikethrough: true }),
  STRONG: () => ({ bold: true }),
  U: () => ({ underline: true }),
  SPAN: function (el) {
    // google docs doesn't use tags for inline elements instead it uses CSS styles, we need to get the styles and apply proper properties
    const style = el?.style
    let value = {}

    if (!style) {
      return value
    }

    switch (style.fontStyle) {
      case 'italic':
        value = {
          ...value,
          ...this.EM()
        }
        break
      case 'bold':
        value = {
          ...value,
          ...this.EM()
        }
        break
    }

    if (el?.parentElement?.nodeName !== 'A' && style.textDecoration === 'underline') {
      value = {
        ...value,
        ...this.U()
      }
    }

    if (Number(style.fontWeight) >= 700) {
      value = {
        ...value,
        ...this.STRONG()
      }
    }

    return value
  }
}

const deserialize = (el: HTMLElement | ChildNode): Array<Node | string | null> | (Node | string | null) => {
  if (el.nodeType === 3) {
    return el.textContent
  } else if (el.nodeType !== 1) {
    return null
  } else if (el.nodeName === 'BR') {
    return '\n'
  }

  const { nodeName } = el
  let parent = el

  if (
    nodeName === 'PRE' &&
    el.childNodes[0] &&
    el.childNodes[0].nodeName === 'CODE'
  ) {
    parent = el.childNodes[0]
  }
  let children: Array<Node | string | null> = Array.from(parent.childNodes)
    .map(deserialize)
    .flat()

  if (children.length === 0) {
    children = [{ text: '' }]
  }

  // if (nodeName === 'BODY') {
  //   return jsx('fragment', {}, children)
  // }

  if (nodeName === 'B' && (el as HTMLElement).id.startsWith(gDocsIdentifier)) {
    return jsx('fragment', {}, children)
  }

  if (ELEMENT_TAGS[nodeName]) {
    const attrs = ELEMENT_TAGS[nodeName](el as HTMLElement)
    return jsx('element', attrs, children)
  }

  if (TEXT_TAGS[nodeName]) {
    const attrs = TEXT_TAGS[nodeName](el as HTMLElement)
    return children.map(child => jsx('text', attrs, child))
  }

  return children
}

const gDocsIdentifier = 'docs-internal-guid-'
const detectGDocsRegex = new RegExp(`id=["|']?${gDocsIdentifier}`)

export const withGoogleDoc = (editor: Editor) => {
  const { insertData, isInline, isVoid } = editor

  const canHandle = (html: string): boolean => {
    return detectGDocsRegex.test(html)
  }

  editor.isInline = element => {
    return element.type === 'link' ? true : isInline(element)
  }

  // editor.isVoid = element => {
  //   return element.type === 'image' ? true : isVoid(element)
  // }

  editor.insertData = data => {
    const html = data.getData('text/html')
    console.log('withHtml::: insertData::: ', html)

    if (canHandle(html)) {
      const parsed = new DOMParser().parseFromString(html, 'text/html')
      const startElement = parsed.body.querySelector(`[id^=${gDocsIdentifier}]`)

      if (startElement) {
        const fragment = deserialize(startElement)
        console.log({fragment})
        try {
          Transforms.insertFragment(editor, fragment as Node[])
        } catch (e) {
          // Issue: Slate is loosing the ending reference `endRef.current` and throws an error:
          // https://github.com/ianstormtaylor/slate/issues/4857
          console.log('Error inserting data::: ', e)
        }
        return
      }

      // const fragment = deserialize(parsed.body)
      // console.log({fragment})
      //
      // try {
      //   Transforms.insertFragment(editor, fragment as Node[])
      // } catch (e) {
      //   console.log('Error inserting data::: ', e)
      // }
      // return
    }

    insertData(data)
  }

  return editor
}