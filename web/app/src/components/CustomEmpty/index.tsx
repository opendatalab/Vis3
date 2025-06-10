import React from 'react'

import EmptyElement from '@/assets/empty.svg?react'
import { useTranslation } from '@vis3/kit'

export default function CustomEmpty({ description }: {
  description?: React.ReactNode
}) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col justify-center items-center py-4">
      <EmptyElement className="w-20 h-20" />
      <p className="text-[var(--color-text-secondary)]">{description ?? t('noData')}</p>
    </div>
  )
}
