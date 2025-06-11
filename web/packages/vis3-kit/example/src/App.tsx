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
    content: "{\"pdf_name\": \"academic_literature_6ac08aae4a9de359ec55db33a81fcc92_page_1.pdf\", \"img_name\": \"academic_literature_6ac08aae4a9de359ec55db33a81fcc92_page_1.jpg\", \"s3_pdf_path\": \"s3://qa-huawei/exmaple/pdf/academic_literature_6ac08aae4a9de359ec55db33a81fcc92_page_1.pdf\", \"s3_img_path\": \"s3://qa-huawei/exmaple/img/academic_literature_6ac08aae4a9de359ec55db33a81fcc92_page_1.jpg\", \"pharse_level\": \"中\", \"pdf_category\": \"论文\", \"pdf_layout\": [\"复合布局\", \"双栏\"], \"pdf_element\": [\"公式-印刷体\", \"文本-印刷体\", \"背景-白色\"], \"pdf_watermark\": \"否\", \"pdf_language\": \"英语\"}\r",
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
