import { i18n } from "@vis3/i18n"
import { Button, Modal } from "antd"
import { AxiosError } from "axios"

export function gid() {
  return Math.random().toString(36).substring(2, 15)
}

export function handleBucketError(e: AxiosError<{ err_code: number, detail: { bucket: string, endpoint: string }[] }> | null, path: string) {
  const errorCode = e?.response?.data?.err_code
  

  Modal.destroyAll()

  if (errorCode === 40001) {
    Modal.warning({
      title: i18n.t('renderer.noPermission'),
      content: i18n.t('renderer.needPermission'),
      footer: (
        <div className="flex gap-2 items-center justify-end pt-2">
          <Button onClick={() => Modal.destroyAll()}>{i18n.t('renderer.iKnow')}</Button>
          <Button
            type="primary"
            onClick={() => {
              Modal.destroyAll()
              document.dispatchEvent(new CustomEvent('open-bucket-manager', { detail: { path } }))
            }}
          >
            {i18n.t('renderer.addNow')}
          </Button>
        </div>
      ),
    })
  }

  if (errorCode === 40002) {
    Modal.warning({
      title: i18n.t('renderer.pathNotExist'),
      content: (
        <div>
          <p>{i18n.t('renderer.ifPathExists')}</p>
          <p>
            {i18n.t('renderer.step1AddKey')}
          </p>
          <p>{i18n.t('renderer.step2AddPath')}</p>
        </div>
      ),
      footer: (
        <div className="flex gap-2 items-center justify-end pt-2">
          <Button onClick={() => Modal.destroyAll()}>{i18n.t('renderer.iKnow')}</Button>
          <Button
            type="primary"
            onClick={() => {
              Modal.destroyAll()
              document.dispatchEvent(new CustomEvent('open-bucket-manager', { detail: { path } }))
            }}
          >
            {i18n.t('renderer.addNow')}
          </Button>
        </div>
      ),
    })
  }
}


export function downloadFromUrl(url: string, name?: string) {
  const link = document.createElement('a')
  link.href = url

  if (name) {
    link.setAttribute('download', name)
  }

  document.body.appendChild(link)
  link.click()
  setTimeout(() => {
    document.body.removeChild(link)
  })
}

export async function download(fullPath: string) {
  if (!fullPath.startsWith('s3://')) {
    throw new Error('s3路径必须以s3://开头')
  }

  const basename = fullPath.split('/').pop()!

  try {
    const params = { path: fullPath } as any

    const searchParams = new URLSearchParams(params)
    const downloadUrl = `/api/v1/bucket/download?${searchParams.toString()}`

    // window.open(downloadUrl, '_blank')
    downloadFromUrl(downloadUrl, basename)
  }
  catch (error) {
    throw new Error('下载失败')
  }
}