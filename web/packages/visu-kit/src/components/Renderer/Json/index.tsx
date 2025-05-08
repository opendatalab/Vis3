import { CloseOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
import clsx from 'clsx'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import ReactGridLayout from 'react-grid-layout'

import { JsonViewer } from '../../../components/CodeViewer'
import { CodeViewerContext, useCodeViewerContext } from '../../../components/CodeViewer/context'
import type { CustomEventJsonNodeDetail } from '../../../components/CodeViewer/json-key-plugin'
import FullScreenButton from '../../../components/FullscreenButton'
import { gid } from '../../../utils'
import type { RendererProps } from '../Card'
import RenderCard from '../Card'
import { usePreviewBlockContext } from '../contexts/preview.context'
import type { FieldBlock } from '../Jsonl'
import { FieldChain, FieldRendererWrapper, inferDefaultRenderAs } from '../Jsonl'
import useCopy from '../stateHooks/useCopy'
import usePreview from '../stateHooks/usePreview'
import type { RenderType } from '../stateHooks/useRenderType'
import useWrap from '../stateHooks/useWrap'

export default function JsonCard({ className, name, value, extraTail, titleExtra }: RendererProps) {
  const [stateValue, setStateValue] = useState(value)
  const parentCodeViewerContext = useCodeViewerContext()
  const { id: propsBlockId, basename } = usePreviewBlockContext()
  const [copyButton] = useCopy(stateValue)
  const [size, setSize] = useState({
    width: 0,
    height: 0,
  })
  const cardRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [jsonError, setJsonError] = useState('')
  const subOpendKeys = useRef<Record<string, FieldChain>>({
    'origin-__whole__': new FieldChain(''),
  })
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
  const [previewConfig, setPreviewConfig] = useState<FieldBlock[]>([])

  const onPreview = useCallback((changedValue: boolean) => {
    // 首次预览打开默认预览的字段区块
    if (changedValue) {
      setPreviewConfig((pre) => {
        if (pre.length === 0) {
          return [{ id: 'whole', field: '__whole__', renderAs: 'json' }]
        }

        return pre
      })
    }
  }, [])

  const [, { preview }, setPreview] = usePreview(false, onPreview)
  const [wrapButton, { wrap }] = useWrap(parentCodeViewerContext.wrap)

  useEffect(() => {
    setStateValue(value)
  }, [value])

  useEffect(() => {
    subOpendKeys.current['origin-__whole__'] = new FieldChain('')
    setPreviewConfig([])
  }, [basename])

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

  useEffect(() => {
    const handleJsonKeyOnClick = (e: CustomEvent<CustomEventJsonNodeDetail>) => {
      // __whole__内再点击字段，不再内部打开预览区块，防止套娃
      if (name === '__whole__') {
        return
      }

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

  return (
    <CodeViewerContext.Provider value={contextValue}>
      <RenderCard
        className={className}
        name={name}
        ref={cardRef}
        titleExtra={titleExtra}
        extra={(
          <div className="flex gap-2 items-center">
            {!preview && wrapButton}
            {copyButton}
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
  )
}
