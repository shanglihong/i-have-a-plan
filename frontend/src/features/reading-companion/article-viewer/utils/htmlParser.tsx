import React from "react"

/**
 * 将 HTML 字符串解析为 React 节点树
 * 对于其中的纯文本节点 (TEXT_NODE)，触发 renderTextNode 回调进行自定义高亮/标注渲染
 */
export function parseHtmlToReact(
  htmlString: string,
  renderTextNode: (textSegment: string, segmentIndex: number) => React.ReactNode
): React.ReactNode {
  if (!htmlString) return null

  // 简单判断是否包含 HTML 标签
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(htmlString)
  if (!hasHtmlTags) {
    return renderTextNode(htmlString, 0)
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlString, "text/html")
    const body = doc.body

    let textCounter = 0

    const convertNodeToReact = (node: Node, key: string): React.ReactNode => {
      // 1. 文本节点：交给 renderTextNode 渲染高亮与 Popover
      if (node.nodeType === Node.TEXT_NODE) {
        const textContent = node.textContent || ""
        if (!textContent) return null
        textCounter++
        return <React.Fragment key={key}>{renderTextNode(textContent, textCounter)}</React.Fragment>
      }

      // 2. 元素节点：递归转换为 React 元素
      if (node.nodeType === Node.ELEMENT_NODE) {
        const elem = node as HTMLElement
        const tagName = elem.tagName.toLowerCase()

        // 过滤脚本与样式危险节点
        if (tagName === "script" || tagName === "style") return null

        const props: Record<string, any> = { key }

        // 处理 className
        if (elem.className) {
          props.className = elem.className
        }

        // 处理行内 style 属性
        if (elem.style && elem.style.cssText) {
          const styleObj: Record<string, string> = {}
          for (let i = 0; i < elem.style.length; i++) {
            const propName = elem.style[i]
            const camelProp = propName.replace(/-([a-z])/g, (_, g) => g.toUpperCase())
            styleObj[camelProp] = elem.style.getPropertyValue(propName)
          }
          props.style = styleObj
        }

        // 转换子节点
        const children = Array.from(elem.childNodes).map((child, idx) =>
          convertNodeToReact(child, `${key}-${idx}`)
        )

        // 常见自闭合单标签
        if (["img", "br", "hr", "input"].includes(tagName)) {
          if (tagName === "img") {
            props.src = elem.getAttribute("src") || ""
            props.alt = elem.getAttribute("alt") || ""
          }
          return React.createElement(tagName, props)
        }

        return React.createElement(tagName, props, children.length > 0 ? children : undefined)
      }

      return null
    }

    const reactChildren = Array.from(body.childNodes).map((child, idx) =>
      convertNodeToReact(child, `root-${idx}`)
    )

    return <>{reactChildren}</>
  } catch (e) {
    // 发生解析异常时优雅降级
    return renderTextNode(htmlString, 0)
  }
}
