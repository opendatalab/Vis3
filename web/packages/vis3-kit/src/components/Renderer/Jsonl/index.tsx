import { CloseOutlined } from '@ant-design/icons'
import styled from '@emotion/styled'
import { Button, Tooltip } from 'antd'
import { Draft07 } from 'json-schema-library'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import ReactGridLayout from 'react-grid-layout'

import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import './index.css'

import { useTranslation } from '../../../i18n'
import { get, gid } from '../../../utils'
import { JsonViewer } from '../../CodeViewer'
import { CodeViewerContext } from '../../CodeViewer/context'
import { JSON_KEY_CLICK_EVENT, type CustomEventJsonNodeDetail } from '../../CodeViewer/json-key-plugin'
import FullScreenButton from '../../FullscreenButton'
import type { RendererProps } from '../Card'
import RenderCard from '../Card'
import { RenderCardContext } from '../contexts/card.context'
import { FieldContext } from '../contexts/field.context'
import { usePreviewBlockContext } from '../contexts/preview.context'
import useCopy from '../stateHooks/useCopy'
import usePreview from '../stateHooks/usePreview'
import type { RenderType } from '../stateHooks/useRenderType'
import useRenderType from '../stateHooks/useRenderType'
import useWrap from '../stateHooks/useWrap'
import renders from '../withtout_jsonl'
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

const StyledWrapper = styled(FieldRendererWrapper)`
  height: 100%;
  overflow: auto;
`

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

    const updateSize = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }

      timeoutId = window.setTimeout(() => {
        const wrapRect = wrapper.getBoundingClientRect()
        const parentRect = wrapper.parentElement?.getBoundingClientRect()
    
        setSize({
          width: wrapRect.width,
          height: parentRect?.height ?? 0,
        })
      }, 200) // 200ms的防抖延迟
    }

    const observer = new ResizeObserver(updateSize)
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

const ExtraContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`

const WrapperDiv = styled.div`
  min-height: ${({ height }: { height: number }) => `${height}px`};
`

const ErrorContainer = styled.div`
  width: 100%;
  background-color: #fee2e2;
  padding: 0.5rem;
`

const ErrorText = styled.div`
  color: #ef4444;
`

const JsonViewerStyled = styled(JsonViewer)<{ visible: boolean }>`
  display: ${({ visible }) => (visible ? 'block' : 'none')};
`

const PreviewContainer = styled.div<{ visible: boolean }>`
  display: ${({ visible }) => (visible ? 'block' : 'none')};
`

const StyledGridItem = styled.div`
  background-color: #f0f0f0;
  border-radius: 0.25rem;
`

export default function JsonlCard({ className, name, value, extraTail, titleExtra }: RendererProps) {
  const { id: propsBlockId, basename, path } = usePreviewBlockContext()
  const [stateValue, setStateValue] = useState(value)
  const [wrapButton, { wrap }] = useWrap()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [jsonError, setJsonError] = useState('')
  const cardRef = useRef<HTMLDivElement>(null)
  const [previewConfig, setPreviewConfig] = useState<FieldBlock[]>([])
  const { t } = useTranslation()
  
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
  const [copyButton] = useCopy(parsedValue)
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
            value: get(parsedValue, _item) ?? parsedValue,
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
    __root__: new FieldChain(''),
  })

  useEffect(() => {
    setStateValue(value)
  }, [value])

  // 文件切换，清空字段链缓存，初始化预览区块
  useEffect(() => {
    subOpendKeys.current.__root__ = new FieldChain('')
    setPreviewConfig([])
  }, [basename])

  useEffect(() => {
    const handleJsonKeyOnClick = (e: CustomEvent<CustomEventJsonNodeDetail>) => {
      const objectField = e.detail.field
      const blockId = e.detail.blockId
      const parentField = e.detail.parentField ?? '__whole__'
      const indexKey = `${blockId}-${objectField}`
      const parentIndexKey = `${blockId}-${parentField}`

      const parentFieldChain = subOpendKeys.current[parentIndexKey]
      const fieldChain = new FieldChain(objectField, parentFieldChain)
      const renderAs = inferDefaultRenderAs(objectField, e.detail.value)

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
    document.addEventListener(JSON_KEY_CLICK_EVENT, handleJsonKeyOnClick as EventListener)

    return () => {
      document.removeEventListener(JSON_KEY_CLICK_EVENT, handleJsonKeyOnClick as EventListener)
    }
  }, [propsBlockId, previewConfig, parsedValue, setPreview])

  const size = useContainerSize(wrapperRef.current)

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
          className={className}
          name={name}
          ref={cardRef}
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
        >
          <div ref={wrapperRef}>
            {
              jsonError && (
                <ErrorContainer>
                  <ErrorText>{jsonError}</ErrorText>
                </ErrorContainer>
              )
            }
            <PreviewContainer visible={preview}>
              <WrapperDiv height={size.height}>
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
                      <StyledGridItem key={innerBlock.id}>
                        <StyledWrapper
                          renderAs={innerBlock.renderAs as RenderType}
                          name={innerBlock.field}
                          value={innerBlock.field === '__whole__' ? parsedValue : get(parsedValue, innerBlock.field) ?? ''}
                          extraTail={
                            innerBlock.field !== '__whole__' && (
                              <>
                                <Tooltip title={t('renderer.close')}>
                                  <Button size="small" type="text" icon={<CloseOutlined />} onClick={() => handleClose?.(innerBlock.id)} />
                                </Tooltip>
                              </>
                            )
                          }
                        />
                      </StyledGridItem>
                    )
                  })}
                </ReactGridLayout>
              </WrapperDiv>
            </PreviewContainer>
            <JsonViewerStyled visible={!preview} />
          </div>
        </RenderCard>
      </CodeViewerContext.Provider>
    </FieldContext.Provider>
  )
}
