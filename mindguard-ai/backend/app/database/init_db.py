"""Create all tables. Safe to run repeatedly.

Run:  python -m app.database.init_db [--reset]
"""

from __future__ import annotations

import argparse

from sqlalchemy import inspect

from app.database import connection
from app.database import models  # noqa: F401  (registers tables)
from app.database.connection import Base


def init_db(reset: bool = False) -> list[str]:
    if reset:
        Base.metadata.drop_all(bind=connection.engine)
    Base.metadata.create_all(bind=connection.engine)
    return sorted(inspect(connection.engine).get_table_names())


def main(argv=None) -> None:
    parser = argparse.ArgumentParser(description="Initialise the Sisyphus SQLite database.")
    parser.add_argument("--reset", action="store_true", help="drop and recreate all tables")
    args = parser.parse_args(argv)
    tables = init_db(reset=args.reset)
    print(f"Database ready at {connection.engine.url}: tables {tables}")


if __name__ == "__main__":
    main()
