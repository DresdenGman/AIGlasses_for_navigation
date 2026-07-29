import uvicorn

from aiglasses.config import load_settings
from aiglasses.service import create_app

settings = load_settings()
app = create_app(settings)


if __name__ == "__main__":
    uvicorn.run(app, host=settings.host, port=settings.port)
