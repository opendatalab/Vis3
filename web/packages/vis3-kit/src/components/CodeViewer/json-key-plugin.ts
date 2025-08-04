import { syntaxTree } from '@codemirror/language'
import type { EditorState } from '@codemirror/state'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import { Decoration, EditorView, ViewPlugin } from '@codemirror/view'

export const JSON_KEY_CLICK_EVENT = 'json-key-click'

export type KeyPath = (string | number)[]

export interface CustomEventJsonNodeDetail {
  field: string
  valueType: string
  blockId?: string
  value: any
  parentField: string
}

export interface JsonNode {
  key: string
  depth: number
  start: number
  end: number
  pathArray: KeyPath
  path: string
}

function keyPathToString(path: KeyPath) {
  return path.map((p, index) => {
    if (typeof p === 'number') {
      return `[${p}]`
    }

    if (index === 0) {
      return p
    }

    return `.${p}`
  }).join('')
}

function parseJSONFromCodeMirror(state: EditorState): JsonNode[] {
  const results: JsonNode[] = []
  const processedPositions = new Set<string>() // 用于跟踪已处理的节点位置
  const tree = syntaxTree(state)

  // 深度优先递归遍历整个语法树
  function traverse(node: any, path: KeyPath = []): void {
    const type = node.type.name
    const from = node.from
    const to = node.to

    // 处理根数组
    if (type === 'JsonText' && node.firstChild && node.firstChild.type.name === 'Array') {
      processRootArray(node.firstChild)
      return
    }

    // 处理属性名
    if (type === 'PropertyName') {
      const keyName = state.doc.sliceString(from, to).replace(/['"]/g, '')
      const keyPath = [...path, keyName]

      // 使用from-to作为唯一标识符
      const positionKey = `${from}-${to}`

      // 检查此位置是否已处理过，避免重复
      if (!processedPositions.has(positionKey)) {
        processedPositions.add(positionKey)

        // 添加这个属性到结果
        results.push({
          key: keyName,
          depth: path.length,
          start: from,
          end: to,
          pathArray: keyPath,
          path: keyPathToString(keyPath),
        })
      }

      // 获取下一个兄弟节点（值节点）
      let valueNode = node.nextSibling
      while (valueNode && !isValueNode(valueNode.type.name)) {
        valueNode = valueNode.nextSibling
      }

      // 如果找到值节点且是容器，则递归处理
      if (valueNode && isContainerNode(valueNode.type.name)) {
        if (valueNode.type.name === 'Array') {
          let arrayIndex = 0

          // 遍历数组的每个元素
          for (let child = valueNode.firstChild; child; child = child.nextSibling) {
            if (isValueNode(child.type.name)) {
              // 数组元素的路径应该是 property[index]
              traverse(child, [...keyPath, arrayIndex])
              arrayIndex++
            }
          }
        }
        else if (valueNode.type.name === 'Object') {
          // 对象的子属性直接传递当前属性路径
          for (let child = valueNode.firstChild; child; child = child.nextSibling) {
            traverse(child, keyPath)
          }
        }
      }

      return
    }

    // 处理数组的直接子元素（数组元素）
    if (path.length > 0 && typeof path[path.length - 1] === 'number' && isValueNode(type)) {
      const arrayIndex = path[path.length - 1]

      // 使用from-to作为唯一标识符
      const positionKey = `${from}-${to}`

      // 检查此位置是否已处理过，避免重复
      if (!processedPositions.has(positionKey)) {
        processedPositions.add(positionKey)

        // 为数组元素添加一个条目
        results.push({
          key: arrayIndex.toString(),
          depth: path.length - 1,
          start: from,
          end: to,
          pathArray: path,
          path: keyPathToString(path),
        })
      }

      // 如果这个元素是容器，则递归处理它的子元素
      if (isContainerNode(type)) {
        if (type === 'Array') {
          let childIndex = 0

          // 处理嵌套数组
          for (let child = node.firstChild; child; child = child.nextSibling) {
            if (isValueNode(child.type.name)) {
              // 为子数组元素添加索引并递归处理
              traverse(child, [...path, childIndex])
              childIndex++
            }
          }
        }
        else if (type === 'Object') {
          // 对象的子属性继承当前路径
          for (let child = node.firstChild; child; child = child.nextSibling) {
            traverse(child, path)
          }
        }
      }

      return
    }

    // 处理根节点或其他节点
    for (let child = node.firstChild; child; child = child.nextSibling) {
      traverse(child, path)
    }
  }

  // 专门处理根数组的函数
  function processRootArray(arrayNode: any): void {
    if (!arrayNode.firstChild) { return }

    let index = 0

    // 遍历根数组的每个元素
    for (let child = arrayNode.firstChild; child; child = child.nextSibling) {
      if (isValueNode(child.type.name)) {
        // 创建带索引的路径
        const elementPath = [index]

        // 使用from-to作为唯一标识符
        const positionKey = `${child.from}-${child.to}`

        // 检查此位置是否已处理过，避免重复
        if (!processedPositions.has(positionKey)) {
          processedPositions.add(positionKey)

          // 添加数组元素节点
          results.push({
            key: index.toString(),
            depth: 0,
            start: child.from,
            end: child.to,
            pathArray: elementPath,
            path: keyPathToString(elementPath),
          })
        }

        // 递归处理子元素
        if (child.type.name === 'Object') {
          // 对象的属性应该有数组索引前缀
          for (let propChild = child.firstChild; propChild; propChild = propChild.nextSibling) {
            traverse(propChild, elementPath)
          }
        }
        else if (child.type.name === 'Array') {
          // 处理嵌套数组
          let childIndex = 0
          for (let arrayChild = child.firstChild; arrayChild; arrayChild = arrayChild.nextSibling) {
            if (isValueNode(arrayChild.type.name)) {
              traverse(arrayChild, [...elementPath, childIndex])
              childIndex++
            }
          }
        }

        index++
      }
    }
  }

  // 辅助函数
  function isValueNode(type: string): boolean {
    return ['JsonText', 'Object', 'Array', 'String', 'Number', 'True', 'False', 'Null'].includes(type)
  }

  function isContainerNode(type: string): boolean {
    return type === 'Object' || type === 'Array'
  }

  // 开始遍历整个语法树
  traverse(tree.topNode)

  return results
}

function handleClick(elem: HTMLElement) {
  const blockId = elem.closest('[data-block-id]')?.getAttribute('data-block-id')
  const parentField = elem.closest('.field-renderer')?.querySelector('.field-name')?.textContent
  const field = elem.getAttribute('data-key-path')

  document.dispatchEvent(new CustomEvent(JSON_KEY_CLICK_EVENT, {
    detail: {
      field,
      blockId,
      parentField,
    },
  }))
}

class KeyPlugin {
  decorations: DecorationSet
  private updateScheduled: boolean = false
  private lastTreeLength: number = 0

  constructor(view: EditorView) {
    this.decorations = Decoration.set([])
    this.scheduleUpdate(view)
  }

  update(update: ViewUpdate) {
    // 检查文档长度是否发生变化
    const currentLength = update.state.doc.length
    const treeLength = syntaxTree(update.state).length

    // 如果文档长度或语法树长度发生变化，触发更新
    if (update.docChanged
      || update.viewportChanged
      || update.changes
      || currentLength !== this.lastTreeLength
      || treeLength !== this.lastTreeLength) {
      this.lastTreeLength = Math.max(currentLength, treeLength)
      this.scheduleUpdate(update.view)
    }
  }

  private scheduleUpdate(view: EditorView) {
    if (this.updateScheduled) { return }
    this.updateScheduled = true

    requestAnimationFrame(() => {
      this.updateScheduled = false
      const nodes = parseJSONFromCodeMirror(view.state)
      const decorations = []
      const maxNodes = 1000 // 限制节点数量，避免超长JSON内容导致性能问题
      const visibleRanges = view.visibleRanges

      try {
        // 只处理可见区域内的节点
        for (const node of nodes) {
          // 确保节点在文档范围内
          if (node.start >= 0
            && node.end <= view.state.doc.length
            && node.start < node.end
            && typeof node.pathArray[node.pathArray.length - 1] !== 'number') {
            // 检查节点是否在可见范围内
            if (this.isNodeInVisibleRange(node, visibleRanges)) {
              decorations.push(
                Decoration.mark({
                  class: 'cm-json-key',
                  attributes: {
                    'data-key-path': node.path,
                    'title': node.path,
                  },
                }).range(node.start + 1, node.end - 1),
              )
            }
          }
  
          // 如果已经处理了足够多的节点，就停止处理
          if (decorations.length >= maxNodes) {
            break
          }
        }
  
        this.decorations = Decoration.set(decorations, true)
        view.update([]) // 触发视图更新
      } catch (error) {
        console.warn(error)
      }
    })
  }

  private isNodeInVisibleRange(node: JsonNode, visibleRanges: readonly { from: number, to: number }[]): boolean {
    // 获取节点的实际显示位置
    const nodeStart = node.start
    const nodeEnd = node.end

    // 检查节点是否在任何可见范围内
    return visibleRanges.some((range) => {
      // 节点完全在可见范围内
      const isFullyVisible = nodeStart >= range.from && nodeEnd <= range.to

      // 节点部分在可见范围内
      const isPartiallyVisible = (
        (nodeStart >= range.from && nodeStart <= range.to) // 节点开始在可见范围内
        || (nodeEnd >= range.from && nodeEnd <= range.to) // 节点结束在可见范围内
        || (nodeStart <= range.from && nodeEnd >= range.to) // 节点跨越可见范围
      )

      return isFullyVisible || isPartiallyVisible
    })
  }
}

const keyDecorationPlugin = ViewPlugin.fromClass(KeyPlugin, {
  decorations: v => v.decorations,
  eventHandlers: {
    click: (e) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('cm-json-key')) {
        handleClick(target)
        return true
      }
      return false
    },
  },
})

export const keyStyle = EditorView.baseTheme({
  '.cm-json-key': {
    textDecoration: 'underline',
    textDecorationStyle: 'dotted',
    cursor: 'pointer',
  },
})

export const jsonKeyLink = [keyDecorationPlugin, keyStyle]
