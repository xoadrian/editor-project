import React, { CSSProperties } from 'react'
import { BaseElement } from 'slate'
import { RenderElementProps } from 'slate-react'

const linkStyle: Record<string, CSSProperties> = {
  link: {
    position: 'relative'
  },
  popup: {
    position: 'absolute',
    left: '0',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: '6px 10px',
    gap: '10px',
    borderRadius: '6px',
    border: '1px solid lightgray'
  }
}

export enum CustomElementType {
  blockQuote = 'block-quote',
  bulletedList = 'bulleted-list',
  headingOne = 'heading-one',
  headingTwo = 'heading-two',
  listItem = 'list-item',
  numberedList = 'numbered-list',
  paragraph = 'paragraph',
  link = 'link'
}

export interface CustomElement extends BaseElement {
  type: CustomElementType
  href?: string
}

const Link: React.FC<RenderElementProps> = ({ attributes, children, element }) => {
  return (
    <span className="element-link" style={linkStyle.link}>
      <a {...attributes} href={element.href}>
        {children}
      </a>
    </span>
  )
}

export const CustomElement: React.FC<RenderElementProps> = (props) => {
  const { attributes, children, element } = props

  switch (element.type) {
    case CustomElementType.blockQuote:
      return <blockquote {...attributes}>{children}</blockquote>
    case CustomElementType.bulletedList:
      return <ul {...attributes}>{children}</ul>
    case CustomElementType.headingOne:
      return <h1 {...attributes}>{children}</h1>
    case CustomElementType.headingTwo:
      return <h2 {...attributes}>{children}</h2>
    case CustomElementType.listItem:
      return <li {...attributes}>{children}</li>
    case CustomElementType.numberedList:
      return <ol {...attributes}>{children}</ol>
    case CustomElementType.link:
      return <Link {...props} />
    default:
      return <p {...attributes}>{children}</p>
  }
}
