import uvicorn
import os

from .rest_api import app as app


def main():
    port = int(os.environ.get("PORT", 8080))
    config = uvicorn.Config(
        "my_quickstart:app",
        host="0.0.0.0",
        port=port,
        log_config="logging.conf",
        use_colors=True,
    )
    server = uvicorn.Server(config)
    server.run()


if __name__ == "__main__":
    main()
