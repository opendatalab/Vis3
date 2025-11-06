import { CloseOutlined } from '@ant-design/icons'
import styled from '@emotion/styled'
import { Button, Tooltip } from 'antd'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import ReactGridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import './index.css'

import { Draft07 } from 'json-schema-library'
import { useTranslation } from '../../../i18n'
import { get, gid } from '../../../utils'
import { JsonViewer } from '../../CodeViewer'
import { CodeViewerContext, useCodeViewerContext } from '../../CodeViewer/context'
import { JSON_KEY_CLICK_EVENT, type CustomEventJsonNodeDetail } from '../../CodeViewer/json-key-plugin'
import FullScreenButton from '../../FullscreenButton'
import type { RendererProps } from '../Card'
import RenderCard from '../Card'
import { usePreviewBlockContext } from '../contexts/preview.context'
// import { FieldChain, FieldRendererWrapper, inferDefaultRenderAs } from '../Jsonl'
import useCopy from '../stateHooks/useCopy'
import usePreview from '../stateHooks/usePreview'
import type { RenderType } from '../stateHooks/useRenderType'
import useWrap from '../stateHooks/useWrap'

import { RenderCardContext } from '../contexts/card.context'
import { FieldContext } from '../contexts/field.context'
import useRenderType from '../stateHooks/useRenderType'
import textRenderers, { getTextRenderer } from '../textRender'
import fileSchema from './schemas/file.schema.json'
import htmlSchema from './schemas/html.schema.json'
import richSchema from './schemas/rich.schema.json'

export interface FieldBlock {
  id: string
  field: string
  renderAs: RenderType
}

const richJsonschema = new Draft07(richSchema)
const htmlJsonschema = new Draft07(htmlSchema)
const fileJsonschema = new Draft07(fileSchema)

const htmlValidFields = ['html', 'main_html', 'body_bytes']
const richValidFields = ['content_list']
const fileValidFields = ['path', 'track_loc']
const otherValidFields = ['content', 'img_list']

const renderOptions = {
  onlyStructured: true,
}

const defaultRenderAs: Record<string, RenderType> = {
  html: 'html',
  main_html: 'html',
  content: 'markdown',
  content_list: 'content_list',
  img_list: 'img_list',
}

const ExtraContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`

const ErrorContainer = styled.div`
  width: 100%;
  background-color: #fee2e2;
  padding: 0.5rem;
`

const ErrorMessage = styled.div`
  color: #ef4444;
`

const GridContainer = styled.div<{ $preview: boolean }>`
  display: ${props => props.$preview ? 'block' : 'none'};
`

const JsonViewerContainer = styled(JsonViewer)<{ visible: boolean }>`
  display: ${props => props.visible ? 'none' : 'block'};
`

const GridItemContainer = styled.div`
  position: relative;
  background-color: #f8fafc;
`

const FieldRendererStyledWrapper = styled(FieldRendererWrapper)`
  height: 100%;
  overflow: auto;
`

interface FieldRendererWrapperProps extends RendererProps {
  renderAs: RenderType
}

class FieldChain {
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

function FieldRendererWrapper({ renderAs, ...props }: FieldRendererWrapperProps) {
  const [renderTypeNode, { renderType }] = useRenderType(renderAs)

  const FieldRenderer = getTextRenderer(renderType ?? renderAs ?? 'raw')?.renderer ?? textRenderers.raw.renderer

  const contextValue = useMemo(() => ({
    renderer: renderTypeNode,
  }), [renderTypeNode])

  return (
    <RenderCardContext.Provider value={contextValue}>
      <FieldRenderer {...props} />
    </RenderCardContext.Provider>
  )
}

export function inferDefaultRenderAs(field: string, value: any) {
  if (field === 'content') {
    return 'markdown'
  }

  // 去除换行 \n \r
  if (typeof value === 'string' && value.replace(/\r|\n/g, '').startsWith('<!DOCTYPE html>')) {
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

export function useContainerSize(wrapper: HTMLDivElement | null) {
  const [size, setSize] = useState({
    width: 0,
    height: 0,
  })
  
  useLayoutEffect(() => {
    if (!wrapper) {
      return
    }

    let timeoutId: number | undefined
    let lastSize = { width: 0, height: 0 }

    const updateSize = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }

      timeoutId = window.setTimeout(() => {
        const wrapRect = wrapper.getBoundingClientRect()
        const parentRect = wrapper.parentElement?.getBoundingClientRect()
        
        const newWidth = Math.floor(wrapRect.width)
        const newHeight = Math.floor(parentRect ? parentRect.height : 0)
        
        // 只有当尺寸变化超过20像素时才更新状态，防止win上闪烁
        if (Math.abs(newWidth - lastSize.width) > 20 || Math.abs(newHeight - lastSize.height) > 20) {
          lastSize = { width: newWidth, height: newHeight }
          setSize(lastSize)
        }
      }, 200)
    }

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(updateSize)
    })
    
    observer.observe(wrapper)

    return () => {
      observer.disconnect()
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [wrapper])

  return size
}

export default function JsonCard({ className, name, value, extraTail, titleExtra }: RendererProps) {
  const [stateValue, setStateValue] = useState(value)
  const parentCodeViewerContext = useCodeViewerContext()
  const { id: propsBlockId, path } = usePreviewBlockContext()
  const [copyButton] = useCopy(stateValue ?? '')
  const { t } = useTranslation()
  const cardRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const subOpendKeys = useRef<Record<string, FieldChain>>({
    __root__: new FieldChain(''),
  })
  const size = useContainerSize(wrapperRef.current)
  const { parsedValue, jsonError } = useMemo(() => {
    if (typeof stateValue !== 'string') {
      return { parsedValue: stateValue, jsonError: '' }
    }

    if (!stateValue.length) {
      return { parsedValue: stateValue, jsonError: '' }
    }

    try {
      return {
        parsedValue: JSON.parse(stateValue),
        jsonError: '',
      }
    }
    catch (_err: any) {
      return {
        parsedValue: stateValue,
        jsonError: _err ? _err.toString() : '',
      }
    }
  }, [stateValue])
  const [previewConfig, setPreviewConfig] = useState<FieldBlock[]>([])

  const jsonKeys = useMemo(() => {
    if (!parsedValue) {
      return []
    }

    if (typeof parsedValue !== 'object') {
      return []
    }

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
              value: get(parsedValue, _item) ?? parsedValue,
              renderAs: defaultRenderAs[_item as keyof typeof defaultRenderAs] ?? 'raw' as RenderType,
            }
          })
  
        setPreviewConfig((pre) => {
          if (pre.length === 0) {
            return [{ id: 'root', field: '__root__', renderAs: 'json' }, ...defaultConfigs]
          }
  
          return pre
        })
      }
    }, [isFile, isHtml, isRich, jsonKeys, parsedValue])

  const [previewButton, { preview }, setPreview] = usePreview(false, onPreview)
  const [wrapButton, { wrap }] = useWrap(parentCodeViewerContext.wrap)

  useEffect(() => {
    setStateValue(value)
  }, [value])

  useEffect(() => {
    const handleJsonKeyOnClick = (e: CustomEvent<CustomEventJsonNodeDetail>) => {
      // __whole__内再点击字段，不再内部打开预览区块，防止套娃
      if (name === '__root__') {
        return
      }

      const objectField = e.detail.field
      const blockId = e.detail.blockId
      const parentField = e.detail.parentField ?? '__root__'
      const indexKey = `${blockId}-${objectField}`
      const parentIndexKey = `${blockId}-${parentField}`

      const parentFieldChain = subOpendKeys.current[parentIndexKey]
      const fieldChain = new FieldChain(objectField, parentFieldChain)
      const renderAs = inferDefaultRenderAs(objectField, e.detail.value)
      const fullPath = fieldChain.fullPath

      subOpendKeys.current[indexKey] = fieldChain

      // 相同jsonl文件内的区块才可以预览，非同一文件内的区块不可预览
      if (propsBlockId !== blockId) {
        return
      }

      try {
        // 没有预览时，第一个预览区块为整个json
        if (previewConfig.length === 0) {
          setPreviewConfig([{ id: 'root', field: '__root__', renderAs: 'json' }, { id: gid(), field: fullPath, renderAs }])
        }
        else if (!previewConfig.find(innerBlock => innerBlock.field === fullPath)) {
          setPreviewConfig((pre) => {
            return [...pre, { id: gid(), field: fullPath, renderAs }]
          })
        }
      }
      catch (e) {
        console.error('error', e)
      }

      setPreview(true)
    }
    // 监听json-key-click事件
    document.addEventListener(JSON_KEY_CLICK_EVENT, handleJsonKeyOnClick as EventListener)

    return () => {
      document.removeEventListener(JSON_KEY_CLICK_EVENT, handleJsonKeyOnClick as EventListener)
    }
  }, [propsBlockId, previewConfig, parsedValue, setPreview, name])

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

  const contextValue = useMemo(() => ({
    wrap: wrap ?? parentCodeViewerContext.wrap,
    value: stateValue,
    // 对 __whole__字段特殊处理，修改需要反应到上一层的context
    onChange: (value: string) => {
      setStateValue(value)
      parentCodeViewerContext?.onChange(value)
    },
  }), [wrap, parentCodeViewerContext, stateValue])

  const handleClose = useCallback((id: string) => {
    setPreviewConfig(pre => pre.filter(innerBlock => innerBlock.id !== id))
  }, [])

  const [renderTypeNode, { renderType }] = useRenderType('json', renderOptions)

  const FieldRenderer = getTextRenderer(renderType ?? 'json')?.renderer ?? textRenderers.raw.renderer

  const renderContextValue = useMemo(() => ({
    renderer: renderTypeNode,
  }), [renderTypeNode])

  const fieldContextValue = useMemo(() => {
    return {
      value: parsedValue,
      path,
    }
  }, [parsedValue, path])

  return (
    <FieldContext.Provider value={fieldContextValue}>
      <CodeViewerContext.Provider value={contextValue}>
        <RenderCardContext.Provider value={renderContextValue}>
          {renderType === 'json' ? (
            <RenderCard
              className={className}
              name={name}
              ref={cardRef}
              titleExtra={titleExtra}
              extra={(
                <ExtraContainer>
                  {!preview && wrapButton}
                  {previewButton}
                  {copyButton}
                  <FullScreenButton elementRef={cardRef as React.RefObject<HTMLElement>} />
                  {extraTail}
                </ExtraContainer>
              )}
            >
              <div ref={wrapperRef}>
                {
                  jsonError && (
                    <ErrorContainer>
                      <ErrorMessage>{jsonError}</ErrorMessage>
                    </ErrorContainer>
                  )
                }
                <GridContainer
                  $preview={preview}
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
                        <GridItemContainer key={innerBlock.id}>
                          <FieldRendererStyledWrapper
                            renderAs={innerBlock.renderAs as RenderType}
                            name={innerBlock.field}
                            value={innerBlock.field === '__root__' ? parsedValue : get(parsedValue, innerBlock.field)}
                            extraTail={
                              innerBlock.field !== '__root__' && (
                                <>
                                  <Tooltip title={t('renderer.close')}>
                                    <Button size="small" type="text" icon={<CloseOutlined />} onClick={() => handleClose?.(innerBlock.id)} />
                                  </Tooltip>
                                </>
                              )
                            }
                          />
                        </GridItemContainer>
                      )
                    })}
                  </ReactGridLayout>
                </GridContainer>
                <JsonViewerContainer visible={preview} />
              </div>
            </RenderCard>
          ) : (
            <FieldRenderer
              className={className}
              name={name}
              ref={cardRef}
              value={stateValue}
              titleExtra={titleExtra}
              extra={(
                <ExtraContainer>
                  {!preview && wrapButton}
                  {previewButton}
                  <FullScreenButton elementRef={cardRef as React.RefObject<HTMLElement>} />
                  {copyButton}
                  {extraTail}
                </ExtraContainer>
              )}
            />
          )}
        </RenderCardContext.Provider>
        
      </CodeViewerContext.Provider>
    </FieldContext.Provider>
  )
}
