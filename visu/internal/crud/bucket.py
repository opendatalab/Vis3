from visu.internal.api.v1.schema.request.bucket import (
    BucketCreatePayload,
    BucketUpdatePayload,
)
from visu.internal.crud.base import BaseCrud
from visu.internal.models.bucket import Bucket


class BucketCRUD(BaseCrud[Bucket, BucketCreatePayload, BucketUpdatePayload]):
    pass


bucket_crud = BucketCRUD()