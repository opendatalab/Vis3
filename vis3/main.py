import threading
import time
import webbrowser
from typing import Any

import uvicorn
from fastapi import FastAPI, Response
from fastapi.staticfiles import StaticFiles
from loguru import logger
from typer import Typer

from vis3.alembic_vis3.run_migrate import run_db_migrations
from vis3.internal.api import initial_routers
from vis3.internal.common.db import init_tables
from vis3.internal.common.exceptions import add_exception_handler
from vis3.internal.config import settings
from vis3.version import version

app = FastAPI(
  title="Vis3",
  description="Visualize s3 data",
  version=version,
  terms_of_service="",
  contact={
      "name": "Vis3",
      "url": "https://github.com/OpenDataLab/Vis3",
      "email": "shenguanlin@pjlab.org.cn",
  },
  license_info={
      "name": "Apache 2.0",
      "url": "https://www.apache.org/licenses/LICENSE-2.0.html",
  },
)


class NoCacheStaticFiles(StaticFiles):
    def __init__(self, *args: Any, **kwargs: Any):
        self.cachecontrol = "max-age=0, no-cache, no-store, must-revalidate"
        self.pragma = "no-cache"
        self.expires = "0"
        super().__init__(*args, **kwargs)

    def file_response(self, *args: Any, **kwargs: Any) -> Response:
        resp = super().file_response(*args, **kwargs)
        
        # No cache for html files
        if resp.media_type == "text/html":
            resp.headers.setdefault("Cache-Control", self.cachecontrol)
            resp.headers.setdefault("Pragma", self.pragma)
            resp.headers.setdefault("Expires", self.expires)
            
        return resp


init_tables()
run_db_migrations()
initial_routers(app)
add_exception_handler(app)

app.mount("", NoCacheStaticFiles(packages=["vis3.internal"], html=True))

cli = Typer()

@cli.callback(invoke_without_command=True)
def main(
    host: str = "localhost", 
    port: int = 8000,
    open: bool = False
):
    if port:
        settings.PORT = str(port)  # 确保PORT是字符串
    if host:
        settings.HOST = host
    
    if open:
        def open_browser():
            time.sleep(2)
            url = f"http://{settings.HOST}:{settings.PORT}"
            logger.info(f"Opening browser: {url}")
            webbrowser.open(url)
        
        # 在后台线程中打开浏览器
        browser_thread = threading.Thread(target=open_browser)
        browser_thread.daemon = True
        browser_thread.start()
        
    logger.info(f"Start server: http://{settings.HOST}:{settings.PORT}")
    uvicorn.run(app=app, host=settings.HOST, port=int(settings.PORT))
        

if __name__ == "__main__":
    cli()