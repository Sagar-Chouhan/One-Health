"""
Create the v2 database, apply the schema and seeds, and copy the existing
state / district masters across with LGD codes as integer keys.

Run from the backend folder:
    python database/setup_database.py                       # onehealth -> onehealth_v2
    python database/setup_database.py --target my_db_name
    python database/setup_database.py --blocks-dump C:/Users/SOURAV/Downloads/block_master.sql

With --blocks-dump it also loads blocks and the sample gram panchayats /
villages (which hang under real blocks). Dummy supervisors are always added.

The source database is only read, never changed. The script refuses to touch
a target database that already has tables in it.
"""

import argparse
import sys
from pathlib import Path

import psycopg
from psycopg import sql

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config.settings import settings  # noqa: E402

HERE = Path(__file__).resolve().parent


def connect(dbname: str, autocommit: bool = False) -> psycopg.Connection:
    return psycopg.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        dbname=dbname,
        autocommit=autocommit,
    )


def create_database(target: str) -> None:
    with connect("postgres", autocommit=True) as conn:
        exists = conn.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s", (target,)
        ).fetchone()
        if not exists:
            conn.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(target)))
            print(f"created database {target}")

    with connect(target) as conn:
        tables = conn.execute(
            "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"
        ).fetchone()[0]
        if tables:
            sys.exit(f"{target} already has {tables} tables - refusing to overwrite it.")


def run_file(target: str, name: str) -> None:
    with connect(target, autocommit=True) as conn:
        conn.execute((HERE / name).read_text(encoding="utf-8"))
    print(f"applied {name}")


def copy_locations(source: str, target: str) -> None:
    with connect(source) as src:
        states = src.execute(
            "SELECT state_lgd_code::int, state_name, state_status FROM state_master"
        ).fetchall()
        # The old district_master.state_id actually holds the state's LGD code,
        # not state_master.state_id - joining on the serial id files Lucknow
        # under Tripura. Join on the LGD code instead.
        districts = src.execute(
            """
            SELECT d.district_lgd_code::int, s.state_lgd_code::int, d.district_name, d.district_status
            FROM district_master d
            JOIN state_master s ON s.state_lgd_code = d.state_id::text
            """
        ).fetchall()

    with connect(target) as dst, dst.cursor() as cur:
        cur.executemany(
            "INSERT INTO state_master (state_lgd_code, state_name, is_active) VALUES (%s, %s, %s)",
            states,
        )
        cur.executemany(
            """
            INSERT INTO district_master (district_lgd_code, state_lgd_code, district_name, is_active)
            VALUES (%s, %s, %s, %s)
            """,
            districts,
        )
    print(f"copied {len(states)} states and {len(districts)} districts from {source}")


def main() -> None:
    parser = argparse.ArgumentParser()
    # The old v1 database the state / district masters are copied from. Not
    # settings.DB_NAME: .env now points the app at the v2 database.
    parser.add_argument("--source", default="onehealth")
    parser.add_argument("--target", default="onehealth_v2")
    parser.add_argument("--blocks-dump", help="path to the RKSK block_master.sql dump")
    args = parser.parse_args()

    if args.source == args.target:
        sys.exit("source and target must differ")

    create_database(args.target)
    run_file(args.target, "01_schema.sql")
    run_file(args.target, "02_seed_masters.sql")
    copy_locations(args.source, args.target)

    if args.blocks_dump:
        from load_blocks import load as load_blocks
        load_blocks(args.blocks_dump, args.target)
        run_file(args.target, "03_sample_gp_village.sql")
    else:
        print("skipped blocks and sample villages (no --blocks-dump)")

    run_file(args.target, "04_sample_supervisors.sql")
    print(f"done - set DB_NAME={args.target} in .env to use it")


if __name__ == "__main__":
    main()
