# @vis3/kit
[![npm](https://img.shields.io/npm/v/%40vis3/kit.svg)](https://www.npmjs.com/package/@vis3/kit)

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/opendatalab/Vis3/tree/main/web/packages/vis3-kit/example)

## Install

```bash
npm i @vis3/kit
# or pnpm add @vis3/kit
```

## Usage

```tsx
import { BucketBlock } from '@vis3/kit'

export default function App() {
  const handleParamsChange = (params) => {
    console.log(params)
  }
  const dataSource = {
    path: "s3://qa-huawei/exmaple/example.jsonl?bytes=0,623",
    type: "file" as const,
    created_by: null,
    mimetype: "application/x-ndjson",
    size: 482972,
    content: "{\"pdf_name\": \"academic_literature_6ac08aae4a9de359ec55db33a81fcc92_page_1.pdf\", \"img_name\": \"academic_literature_6ac08aae4a9de359ec55db33a81fcc92_page_1.jpg\", \"s3_pdf_path\": \"s3://qa-huawei/exmaple/pdf/academic_literature_6ac08aae4a9de359ec55db33a81fcc92_page_1.pdf\", \"s3_img_path\": \"s3://qa-huawei/exmaple/img/academic_literature_6ac08aae4a9de359ec55db33a81fcc92_page_1.jpg\", \"pharse_level\": \"中\", \"pdf_category\": \"论文\", \"pdf_layout\": [\"复合布局\", \"双栏\"], \"pdf_element\": [\"公式-印刷体\", \"文本-印刷体\", \"背景-白色\"], \"pdf_watermark\": \"否\", \"pdf_language\": \"英语\"}\r",
    last_modified: "2025-04-29T10:56:53Z"
  }

  return (
    <BucketBlock
      id="1"
      dataSource={dataSource}
      path="s3://bucketname/"
      onChange={handleParamsChange}
      showPagination={false}
      showDownload={false}
    />
  )
}
```

## Component options

### BucketBlock

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| id | string | - |  |
| path | string | - | s3 file path |
| dataSource | BucketType \| BucketType[] | - | 数据源，可以是单个文件/目录对象或数组 |
| loading | boolean | false | 加载状态 |
| onClose | () => void | - | 关闭按钮点击回调 |
| onDownload | (path: string) => void | - | 下载按钮点击回调 |
| pageSize | number | 50 | 每页显示的条目数 |
| pageNo | number | 1 | 当前页码 |
| onPathCorrection | (path: string) => void | - | 路径修正回调 |
| showGoParent | boolean | false | 是否显示返回上级目录按钮 |
| showPagination | boolean | true | 是否显示分页器 |
| showOpenInNewTab | boolean | false | 是否显示在新标签页打开按钮 |
| showDownload | boolean | true | 是否显示下载按钮 |
| closeable | boolean | false | 是否可关闭 |
| onChange | (params: Partial<BucketParams>) => void | - | 参数变更回调 |
| onLinkClick | (path: string) => void | - | json视图 链接 点击回调 |
| onKeyClick | (field: string, value: string | number | object) => void | - | json视图 字段键 点击回调|
| renderBucketItem | (item: BucketType) => React.ReactNode | - | 自定义渲染列表项 |
| previewUrl | string | - | 预览文件的URL |
| onOpenInNewTab | (path: string) => void | - | 在新标签页打开回调 |
| style | React.CSSProperties | - | 自定义样式 |
| className | string | - | 自定义类名 |

#### BucketType 类型定义

```typescript
interface BaseBucketType {
  type: 'directory' | 'file' | 'bucket'
  path: string
  content: string | null
  size: number | null
  created_by: string | null
  last_modified: string | null
  mimetype: string | null
}
```

#### BucketParams 类型定义

```typescript
interface BucketParams {
  pageSize?: number
  pageNo?: number
  path?: string
}
```
