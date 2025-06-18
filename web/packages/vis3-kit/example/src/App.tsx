import { BucketBlock } from '@vis3/kit';

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
    content: "{\"pdf_name\": \"example.pdf\", \"img_name\": \"example.jpg\", \"s3_pdf_path\": \"s3://qa-huawei/exmaple/pdf/example.pdf\", \"s3_img_path\": \"s3://qa/exmaple/img/example.jpg\", \"pharse_level\": \"中\", \"pdf_category\": \"小说\", \"content\": \"Vis3 is a visualization tool for large language models and machine learning data, supporting cloud storage platforms with S3 protocol (AWS, Alibaba Cloud, Tencent Cloud) and various data formats (JSON, JSONL.gz, WARC.gz, MD, etc.). It offers interactive visualization through JSON, HTML, Markdown, and image views for efficient data analysis.\\n\\n## Features\\n\\n- Supports JSON, JSONL, WARC, and more, automatically recognizing data structures for clear, visual insights.\\n- One-click field previews with seamless switching between web, Markdown, and image views for intuitive operation.\\n- Integrates with S3-compatible cloud storage (Aliyun OSS, AWS, Tencent Cloud) and local file parsing for easy data access.\", \"pdf_layout\": [\"复合布局\", \"双栏\"], \"pdf_element\": [\"公式-印刷体\", \"文本-印刷体\", \"背景-白色\"], \"pdf_watermark\": \"否\", \"pdf_language\": \"英语\"}\r",
    last_modified: "2025-04-29T10:56:53Z"
  }

  return (
    <div>
      <BucketBlock
        id="1"
        dataSource={dataSource}
        path="s3://qa-huawei/exmaple/example.jsonl"
        onChange={handleParamsChange}
        showPagination={false}
        showDownload={false}
      />
    </div>
  )
}
// '{"content":"Vis3 is a visualization tool for large language models and machine learning data, supporting cloud storage platforms with S3 protocol (AWS, Alibaba Cloud, Tencent Cloud) and various data formats (JSON, JSONL.gz, WARC.gz, MD, etc.). It offers interactive visualization through JSON, HTML, Markdown, and image views for efficient data analysis.\\n\\n## Features\\n\\n- Supports JSON, JSONL, WARC, and more, automatically recognizing data structures for clear, visual insights.\\n- One-click field previews with seamless switching between web, Markdown, and image views for intuitive operation.\\n- Integrates with S3-compatible cloud storage (Aliyun OSS, AWS, Tencent Cloud) and local file parsing for easy data access."}'