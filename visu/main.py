from fastapi import FastAPI

from visu.api import initial_routers

app = FastAPI(
  title="VisU",
  description="Visualize s3 data",
  version="0.1.0",
  terms_of_service="",
  contact={
      "name": "VisU",
      "url": "https://github.com/OpenDataLab/VisU",
      "email": "shenguanlin@pjlab.org.cn",
  },
  license_info={
      "name": "Apache 2.0",
      "url": "https://www.apache.org/licenses/LICENSE-2.0.html",
  },
)


initial_routers(app)
