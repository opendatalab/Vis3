from visu.api.v1.schema.request.bucket import BucketCreatePayload, BucketUpdatePayload
from visu.crud.base import BaseCrud
from visu.models.bucket import Bucket


class BucketCRUD(BaseCrud[Bucket, BucketCreatePayload, BucketUpdatePayload]):
    pass


bucket_crud = BucketCRUD()