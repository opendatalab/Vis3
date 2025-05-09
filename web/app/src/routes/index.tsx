import { createFileRoute, useLocation, useNavigate } from '@tanstack/react-router'
import BucketPreviewer, { BucketParams } from '@visu/kit'
import '@visu/kit/dist/index.css'
import { Button } from 'antd'
import { useCallback, useRef } from 'react'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

const supportedCloudPlatforms = [
  {
    name: '华为云',
    icon: '/huawei.png',
  },
  {
    name: '腾讯云',
    icon: '/tencent.png',
  },
  {
    name: '商汤大装置AOS',
    icon: '/sensetime.png',
  },
  {
    name: 'AWS',
    icon: '/aws.png',
  },
  {
    name: '阿里云 OSS',
    icon: '/aliyun.png',
  },
  {
    name: '浪潮云',
    icon: '/inspur.png',
  },
  {
    name: '微软 Azure',
    icon: '/microsoft.png',
  },
]

function RouteComponent() {
  const bodyRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const search = location.search as Record<string, string | number>
  const path = search.path || ''
  const pageSize = Number(search.page_size) || 50
  const pageNo = Number(search.page_no) || 1

  const onParamsChange = useCallback((params: Partial<BucketParams>) => {
    const newSearch = {} as Record<string, string | number>
    if (typeof params.path === 'string') {
      newSearch.path = params.path
    }

    if (params.pageNo) {
      newSearch.page_no = params.pageNo
    }

    if (params.pageSize) {
      newSearch.page_size = params.pageSize
    }
    
    navigate({
      to: '/',
      search: { ...search, ...newSearch },
    })
  }, [navigate, search])

  return (
    <div className="p-4 flex flex-1 flex-col" ref={bodyRef}>
      <BucketPreviewer
        url={path as string}
        onParamsChange={onParamsChange}
        pageSize={pageSize}
        pageNo={pageNo}
        bucketUrl="/api/s3/v1/bucket"
        downloadUrl="/api/s3/v1/bucket/download"
        previewUrl="/api/s3/v1/bucket/file_preview"
        mimeTypeUrl="/api/s3/v1/bucket/mimetype"
        offsetTop={88}
      />
    </div>
  )
  
  return (
    <div className="container mx-auto mt-32">
      {/* 产品标题和描述 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">VisU – 大模型语料可视化工具</h1>
        <p className="text-lg text-gray-600">无缝对接主流云存储与本地数据源，深度解析多格式数据内容</p>
      </div>
      
      {/* 添加路径卡片区域 */}
      <div className="max-w-3xl mx-auto bg-gray-50 rounded-lg p-8 mb-8 flex flex-col items-center">
        {/* 添加路径按钮 */}
        <Button type="primary" size="large">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
            <path d="M12 4v16m-8-8h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          添加路径
        </Button>
      </div>
      
      {/* 底部说明文字 */}
      <div className="text-center text-gray-600">
        <p>请添加S3存储路径，完成访问授权，目前已支持的兼容S3协议的云存储平台如下：</p>
        
        {/* 云存储平台图标列表 */}
        <div className="flex justify-center items-center space-x-6 mt-6">
          {supportedCloudPlatforms.map((platform) => (
            <div key={platform.name} className="bg-white rounded-md w-8 h-8 p-1" title={platform.name}>
              <img src={platform.icon} alt={platform.name} className="w-full h-full object-contain" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
