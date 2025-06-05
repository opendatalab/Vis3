import { ClockCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from '@vis3/kit'
import { Alert, Button, Card, message, Popconfirm } from 'antd'
import dayjs from 'dayjs'
import _ from 'lodash'
import { useEffect, useRef, useState } from 'react'

import type { KeychainResponse } from '../../api/keychain'
import { useDeleteKeychain, useMyKeychains, useUpdateKeychain } from '../../api/keychain.query'
import CopySvg from '../../assets/copy.svg?react'
import DeleteSvg from '../../assets/delete.svg?react'
import CustomEmpty from '../../components/CustomEmpty'
import EditableText from '../../components/EditableText'
import type { KeyChainFormRef } from './-components/Form'
import KeyChainForm from './-components/Form'

export const Route = createFileRoute('/keychain/')({
  component: RouteComponent,
})

function KeyChainCard({ data, className }: {
  data: KeychainResponse
  className?: string
}) {
  const [editable, setEditable] = useState(false)
  const { mutateAsync: updateKeychain } = useUpdateKeychain()
  const { mutateAsync: deleteKeychain } = useDeleteKeychain()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value)
    message.success(t('copied'))
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteKeychain(id)
      message.success(t('keychain.deleted'))
      queryClient.invalidateQueries({ queryKey: ['my_keychain'] })
    }
    catch (err) {
      console.error(err)
    }
  }

  const handleSaveName = async (value: string) => {
    await updateKeychain({ id: data.id, data: { name: value } })
    queryClient.invalidateQueries({ queryKey: ['my_keychain'] })
    message.success(t('keychain.updated'))
  }

  return (
    <Card
      className={className}
      title={<EditableText value={data.name} onChange={handleSaveName} onEditableChange={isEditable => setEditable(isEditable)} />}
      extra={!editable && (
        <div className="flex gap-2">
          <span className="text-gray-400">
            <div className="flex gap-2 items-center">
              <ClockCircleOutlined />
              {dayjs(data.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </div>
          </span>
          <Popconfirm title={t('keychain.deleteConfirm')} onConfirm={() => handleDelete(data.id)}>
            <Button danger type="text" size="small" icon={<DeleteSvg />} />
          </Popconfirm>
        </div>
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-nowrap">Access Key: </span>
          <div className="flex items-center gap-2">
            <span className="text-ellipsis max-w-[200px] overflow-hidden" title={data.access_key_id}>{data.access_key_id}</span>
            <Button type="text" size="small" icon={<CopySvg />} onClick={() => handleCopy(data.access_key_id)} />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-nowrap">Secret Key: </span>
          <div className="flex items-center gap-2">
            <span className="text-ellipsis max-w-[200px] overflow-hidden" title={data.secret_key_id}>***</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

function RouteComponent() {
  const modalFormRef = useRef<KeyChainFormRef>(null)
  const { data } = useMyKeychains(1, 100)
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  useEffect(() => {
    document.title = `Vis3 - AK&SK`
  }, [t])

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex text-2xl font-bold mb-2 items-center justify-between">
        {t('bucketForm.AS&SKManagement')}
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            modalFormRef.current?.open()
          }}
        >
          {t('keychain.add')}
        </Button>
      </div>
      <Alert type="info" message={t('keychain.addAS&SKTips')} showIcon />
      {
        _.isEmpty(data?.data) && (
          <CustomEmpty description={t('keychain.noAK&SK')} />
        )
      }
      <div className="flex flex-wrap gap-4 items-stretch">
        {
          _.chain(data)
            .get('data', [])
            .map(item => (
              <KeyChainCard className="shrink-0 w-full sm:w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(33.33%-0.75rem)] grow-0" data={item} key={item.id} />
            ))
            .value()
        }
      </div>
      <KeyChainForm
        modalFormRef={modalFormRef}
        onClose={() => {
          queryClient.invalidateQueries({ queryKey: ['my_keychain'] })
        }}
      />
    </div>
  )
}
