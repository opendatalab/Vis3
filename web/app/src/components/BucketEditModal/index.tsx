import { Modal } from "antd"

export interface BucketEditModalProps {
  editingId: number
}

export default function BucketEditModal({ editingId }: BucketEditModalProps) {
  const { data: editingBucket } = useBucket(editingId)
  return (
    <Modal>
      
    </Modal>
  )
}
