export interface PaginationParams {
  page_no: number
  page_size: number
}

export interface ResponseWrapper<T> {
  data: T
}

// 正确声明全局Window接口
declare global {
  interface Window {
    __CONFIG__: {
      ENABLE_AUTH: boolean
      VERSION: string
      [key: string]: any
    }
  }
}
