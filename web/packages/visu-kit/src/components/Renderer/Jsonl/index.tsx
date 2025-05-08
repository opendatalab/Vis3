import { CloseOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
import clsx from 'clsx'
import { Draft07 } from 'json-schema-library'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import ReactGridLayout from 'react-grid-layout'

import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import './index.css'

import { JsonViewer } from '../../../components/CodeViewer'
import { CodeViewerContext } from '../../../components/CodeViewer/context'
import type { CustomEventJsonNodeDetail } from '../../../components/CodeViewer/json-key-plugin'
import FullScreenButton from '../../../components/FullscreenButton'
import { gid } from '../../../utils'
import type { RendererProps } from '../Card'
import RenderCard from '../Card'
import { RenderCardContext } from '../contexts/card.context'
import { FieldContext } from '../contexts/field.context'
import { usePreviewBlockContext } from '../contexts/preview.context'
import usePreview from '../stateHooks/usePreview'
import type { RenderType } from '../stateHooks/useRenderType'
import useRenderType from '../stateHooks/useRenderType'
import useWrap from '../stateHooks/useWrap'
import renders from '../withtou_jsonl'
import fileSchema from './schemas/file.schema.json'
import htmlSchema from './schemas/html.schema.json'
import richSchema from './schemas/rich.schema.json'

const richJsonschema = new Draft07(richSchema)
const htmlJsonschema = new Draft07(htmlSchema)
const fileJsonschema = new Draft07(fileSchema)

export interface FieldBlock {
  id: string
  field: string
  renderAs: RenderType
}

interface FieldRendererWrapperProps extends RendererProps {
  renderAs: RenderType
}

const defaultRenderAs: Record<string, RenderType> = {
  html: 'html',
  main_html: 'html',
  content: 'markdown',
  content_list: 'content_list',
  img_list: 'img_list',
}

const htmlValidFields = ['html', 'main_html', 'body_bytes']
const richValidFields = ['content_list']
const fileValidFields = ['path', 'track_loc']
const otherValidFields = ['content', 'img_list']

export function FieldRendererWrapper({ renderAs, ...props }: FieldRendererWrapperProps) {
  const [renderTypeNode, { renderType }] = useRenderType(renderAs)

  const FieldRenderer = renders[(renderType ?? renderAs) as keyof typeof renders] ?? renders.raw

  const contextValue = useMemo(() => ({
    builtIns: renderTypeNode,
  }), [renderTypeNode])

  return (
    <RenderCardContext.Provider value={contextValue}>
      <FieldRenderer {...props} />
    </RenderCardContext.Provider>
  )
}

export function inferDefaultRenderAs(field: string, valueType: string, value: any) {
  if (['object', 'array'].includes(valueType)) {
    return 'json'
  }

  if (field === 'content') {
    return 'markdown'
  }

  // 去除换行 \n \r
  if (valueType === 'string' && value.replace(/\r|\n/g, '').startsWith('<!DOCTYPE html>')) {
    return 'html'
  }

  if (field === 'html' || field === 'main_html') {
    return 'html'
  }

  if (field === 'content_list' || field === 'img_list') {
    return field
  }

  if (Array.isArray(value)) {
    return 'raw'
  }

  return 'raw'
}

export class FieldChain {
  public current: string
  public parent: FieldChain | undefined

  constructor(current: string, parent?: FieldChain) {
    this.current = current
    this.parent = parent
  }

  public get fullPath() {
    let fullPath = this.current
    let parent = this.parent

    while (parent) {
      if (parent.current !== '') {
        fullPath = `${parent.current}.${fullPath}`
      }
      else {
        fullPath = `${fullPath}`
      }
      parent = parent.parent
    }

    return fullPath
  }
}

export default function JsonlCard({ className, name, value, extraTail, titleExtra }: RendererProps) {
  const { id: propsBlockId, basename, path } = usePreviewBlockContext()
  const [stateValue, setStateValue] = useState(value)
  const [wrapButton, { wrap }] = useWrap()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [jsonError, setJsonError] = useState('')
  const cardRef = useRef<HTMLDivElement>(null)
  const [previewConfig, setPreviewConfig] = useState<FieldBlock[]>([])
  const parsedValue = useMemo(() => {
    try {
      setJsonError('')
      return JSON.parse(stateValue)
    }
    catch (_err: any) {
      if (stateValue && stateValue.length > 0) {
        setJsonError(_err.toString())
      }
      return stateValue
    }
  }, [stateValue])
  const jsonKeys = useMemo(() => {
    return Object.keys(parsedValue)
  }, [parsedValue])

  const isHtml = useMemo(() => {
    return htmlJsonschema.validate(parsedValue).length === 0
  }, [parsedValue])
  const isRich = useMemo(() => {
    return richJsonschema.validate(parsedValue).length === 0
  }, [parsedValue])
  const isFile = useMemo(() => {
    return fileJsonschema.validate(parsedValue).length === 0
  }, [parsedValue])

  const onPreview = useCallback((changedValue: boolean) => {
    // 首次预览打开默认预览的字段区块
    if (changedValue) {
      const defaultConfigs = jsonKeys
        .filter((field) => {
          if (isHtml) {
            return htmlValidFields.includes(field)
          }

          if (isRich) {
            return richValidFields.includes(field)
          }

          if (isFile) {
            return fileValidFields.includes(field)
          }

          return otherValidFields.includes(field)
        })
        .map((_item) => {
          return {
            id: gid(),
            field: _item,
            value: parsedValue[_item] ?? parsedValue,
            renderAs: defaultRenderAs[_item as keyof typeof defaultRenderAs] ?? 'raw' as RenderType,
          }
        })

      setPreviewConfig((pre) => {
        if (pre.length === 0) {
          return [{ id: 'whole', field: '__whole__', renderAs: 'json' }, ...defaultConfigs]
        }

        return pre
      })
    }
  }, [isFile, isHtml, isRich, jsonKeys, parsedValue])

  const [previewButton, { preview }, setPreview] = usePreview(false, onPreview)
  const subOpendKeys = useRef<Record<string, FieldChain>>({
    'origin-__whole__': new FieldChain(''),
  })
  const [size, setSize] = useState({
    width: 0,
    height: 0,
  })

  useEffect(() => {
    setStateValue(value)
  }, [value])

  // 文件切换，清空字段链缓存，初始化预览区块
  useEffect(() => {
    subOpendKeys.current['origin-__whole__'] = new FieldChain('')
    setPreviewConfig([])
  }, [basename])

  useEffect(() => {
    const handleJsonKeyOnClick = (e: CustomEvent<CustomEventJsonNodeDetail>) => {
      const objectField = e.detail.field
      const propValueType = e.detail.valueType
      const blockId = e.detail.blockId
      const parentField = e.detail.parentField ?? '__whole__'
      const indexKey = `${blockId}-${objectField}`
      const parentIndexKey = `${blockId}-${parentField}`

      const parentFieldChain = subOpendKeys.current[parentIndexKey]
      const fieldChain = new FieldChain(objectField, parentFieldChain)
      const renderAs = inferDefaultRenderAs(objectField, propValueType, e.detail.value)

      subOpendKeys.current[indexKey] = fieldChain

      // 相同jsonl文件内的区块才可以预览，非同一文件内的区块不可预览
      if (propsBlockId !== blockId) {
        return
      }

      try {
        // 没有预览时，第一个预览区块为整个json
        if (previewConfig.length === 0) {
          setPreviewConfig([{ id: 'whole', field: '__whole__', renderAs: 'json' }, { id: gid(), field: fieldChain.fullPath, renderAs }])
        }
        else if (!previewConfig.find(innerBlock => innerBlock.field === objectField)) {
          setPreviewConfig((pre) => {
            return [...pre, { id: gid(), field: fieldChain.fullPath, renderAs }]
          })
        }
      }
      catch (e) {
        console.error('error', e)
      }

      setPreview(true)
    }
    // 监听json-key-click事件
    document.addEventListener('json-key-click', handleJsonKeyOnClick as EventListener)

    return () => {
      document.removeEventListener('json-key-click', handleJsonKeyOnClick as EventListener)
    }
  }, [propsBlockId, previewConfig, parsedValue, setPreview])

  useLayoutEffect(() => {
    if (wrapperRef.current) {
      const wrapRect = wrapperRef.current.getBoundingClientRect()
      const bucketContainer = document.getElementById('bucketContainer')
      const bucketContainerStyle = window.getComputedStyle(bucketContainer!)

      setSize({
        width: wrapRect.width,
        height: window.innerHeight - wrapRect.top - Number.parseInt(bucketContainerStyle.paddingBottom) - 1,
      })
    }
  }, [])

  const codeViewerContextValue = useMemo(() => ({
    wrap: wrap ?? false,
    value: stateValue,
    onChange: setStateValue,
  }), [wrap, stateValue])

  const fieldContextValue = useMemo(() => {
    return {
      value: parsedValue,
      path,
    }
  }, [parsedValue, path])

  const layout = useMemo(() => {
    if (!wrapperRef.current) {
      return
    }

    const len = previewConfig.length ?? 1
    const perWidth = Math.floor(96 / len)
    const perHeight = Math.floor(size.height / 4)

    return previewConfig.map((innerBlock, index) => {
      return {
        i: innerBlock.id,
        x: perWidth * index,
        y: 0,
        w: perWidth,
        h: perHeight,
      }
    })
  }, [previewConfig, size.height])

  const handleClose = useCallback((id: string) => {
    setPreviewConfig(pre => pre.filter(innerBlock => innerBlock.id !== id))
  }, [])

  return (
    <FieldContext.Provider value={fieldContextValue}>
      <CodeViewerContext.Provider value={codeViewerContextValue}>
        <RenderCard
          className={clsx(className)}
          name={name}
          ref={cardRef}
          titleExtra={titleExtra}
          extra={(
            <div className="flex gap-2 items-center">
              {!preview && wrapButton}
              {previewButton}
              <FullScreenButton elementRef={cardRef as React.RefObject<HTMLElement>} />
              {extraTail}
            </div>
          )}
        >
          <div ref={wrapperRef}>
            {
              jsonError && (
                <div className="w-full bg-red-100 p-2">
                  <div className="text-red-500">{jsonError}</div>
                </div>
              )
            }
            <div
              className={clsx(className, {
                hidden: !preview,
                block: preview,
              })}
              style={{
                minHeight: size.height,
              }}
            >
              <ReactGridLayout
                layout={layout}
                cols={96}
                rowHeight={4}
                draggableHandle=".field-name"
                width={size.width}
                margin={[0, 0]}
                className="draggable-layout"
                resizeHandles={['nw', 'se', 'ne', 'sw']}
              >
                {previewConfig.map((innerBlock) => {
                  return (
                    <div key={innerBlock.id} className="relative bg-slate-50">
                      <FieldRendererWrapper
                        renderAs={innerBlock.renderAs as RenderType}
                        name={innerBlock.field}
                        className="h-full overflow-auto"
                        value={innerBlock.field === '__whole__' ? parsedValue : parsedValue[innerBlock.field] ?? ''}
                        extraTail={
                          innerBlock.field !== '__whole__' && (
                            <>
                              {/* <Divider type="vertical" className="mx-[4px]" /> */}
                              <Tooltip title="关闭">
                                <Button size="small" type="text" icon={<CloseOutlined />} onClick={() => handleClose?.(innerBlock.id)} />
                              </Tooltip>
                            </>
                          )
                        }
                      />
                    </div>
                  )
                })}
              </ReactGridLayout>
            </div>
            <JsonViewer className={clsx({
              hidden: preview,
              block: !preview,
            })}
            />
          </div>
        </RenderCard>
      </CodeViewerContext.Provider>
    </FieldContext.Provider>
  )
}
