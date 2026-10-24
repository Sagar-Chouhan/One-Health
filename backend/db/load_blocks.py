"""
Load block_master from the RKSK MySQL dump (block_master.sql) into the v2 schema.

Run from the backend folder:
    python database/load_blocks.py C:/Users/SOURAV/Downloads/block_master.sql

The dump is not clean LGD data, so every row is checked before it goes in.
Rows that cannot be loaded safely are written to
database/rejects/blocks_rejected.csv with the reason - nothing is dropped
silently. Re-running is safe: existing blocks are updated, not duplicated.

Rejection rules
  * "Test" rows.
  * State or district not in our masters, or the district belongs to a
    different state there. The dump uses its own codes for Delhi (state 40,
    districts 777-787), Mumbai, Kolkata, Chennai and the 2023 Rajasthan /
    Gujarat districts (4977-5005); in real LGD those numbers are other
    districts (775 = Balotra, 784 = Maihar...), so they cannot be mapped.
  * The same block LGD code on more than one row. Many of these are rows
    whose "LGD code" is just the dump's own row id; those lose to any row
    with a real code. Among the rest, the genuine row is the one whose code
    sits among its district siblings' codes (LGD numbers the blocks of a
    district in a run). Groups made only of the dump's private 909xxx codes
    are rejected outright.
  * A second block with the same name in the same district.
"""

import csv
import re
import statistics
import sys
from collections import defaultdict
from pathlib import Path

import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config.settings import settings  # noqa: E402

TARGET_DB = "onehealth_v2"
REJECTS = Path(__file__).resolve().parent / "rejects" / "blocks_rejected.csv"
ROW = re.compile(r"[(]([0-9]+), ([0-9]+), '([^']*)', ([0-9]+), ([0-9]+), '([01])'[)]")
PRIVATE_CODE = 900000   # 909xxx codes are the dump's own, not LGD


def parse(path: str) -> list[dict]:
    text = Path(path).read_text(encoding="utf-8")
    return [
        {
            "dump_id": int(i),
            "block_lgd_code": int(code),
            "block_name": " ".join(name.split()),
            "state_lgd_code": int(state),
            "district_lgd_code": int(district),
            "is_active": status == "1",
        }
        for i, code, name, state, district, status in ROW.findall(text)
    ]


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("usage: python database/load_blocks.py <path to block_master.sql>")
    load(sys.argv[1])


def load(dump_path: str, target_db: str = TARGET_DB) -> None:
    rows = parse(dump_path)
    rejected: list[dict] = []

    def reject(row: dict, reason: str) -> None:
        rejected.append({**row, "reason": reason})

    conn = psycopg.connect(
        host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER,
        password=settings.DB_PASSWORD, dbname=target_db,
    )
    states = {r[0] for r in conn.execute("SELECT state_lgd_code FROM state_master")}
    districts = dict(conn.execute(
        "SELECT district_lgd_code, state_lgd_code FROM district_master").fetchall())

    # 1. Rows that cannot be placed in our hierarchy.
    placeable = []
    for r in rows:
        if r["block_name"].lower() == "test":
            reject(r, "test row")
        elif r["state_lgd_code"] not in states:
            reject(r, f"state {r['state_lgd_code']} is not an LGD state code")
        elif r["district_lgd_code"] not in districts:
            reject(r, f"district {r['district_lgd_code']} not in district_master")
        elif districts[r["district_lgd_code"]] != r["state_lgd_code"]:
            reject(r, f"district {r['district_lgd_code']} belongs to state "
                      f"{districts[r['district_lgd_code']]} in LGD, not {r['state_lgd_code']}")
        else:
            placeable.append(r)

    # 2. Duplicate LGD codes: keep the row whose code fits its district's run.
    by_code = defaultdict(list)
    for r in placeable:
        by_code[r["block_lgd_code"]].append(r)

    codes_by_district = defaultdict(list)
    for r in placeable:
        codes_by_district[r["district_lgd_code"]].append(r["block_lgd_code"])

    def distance_from_siblings(r: dict) -> float:
        siblings = [c for c in codes_by_district[r["district_lgd_code"]]
                    if c != r["block_lgd_code"] and c < PRIVATE_CODE]
        if not siblings:
            return float("inf")
        return abs(r["block_lgd_code"] - statistics.median(siblings))

    unique = []
    for code, group in by_code.items():
        if len(group) == 1:
            unique.append(group[0])
            continue
        if code >= PRIVATE_CODE:
            for r in group:
                reject(r, f"private code {code} used by {len(group)} rows")
            continue
        # A row whose "LGD code" equals its own dump row id is a filler, not
        # an LGD code - prefer any row that has a real one.
        genuine = [r for r in group if r["block_lgd_code"] != r["dump_id"]] or group
        keep = min(genuine, key=distance_from_siblings)
        unique.append(keep)
        for r in group:
            if r is not keep:
                reject(r, f"LGD code {code} also used by '{keep['block_name']}' "
                          f"(district {keep['district_lgd_code']}), which fits that code")

    # 3. Same name twice in one district (violates uq_block_district_name).
    seen = {}
    final = []
    for r in sorted(unique, key=lambda x: x["block_lgd_code"]):
        key = (r["district_lgd_code"], r["block_name"].lower())
        if key in seen:
            reject(r, f"duplicate name in district; kept LGD {seen[key]}")
            continue
        seen[key] = r["block_lgd_code"]
        final.append(r)

    with conn, conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO block_master
                (block_lgd_code, district_lgd_code, state_lgd_code, block_name, is_active)
            VALUES (%(block_lgd_code)s, %(district_lgd_code)s, %(state_lgd_code)s,
                    %(block_name)s, %(is_active)s)
            ON CONFLICT (block_lgd_code) DO UPDATE
               SET district_lgd_code = EXCLUDED.district_lgd_code,
                   state_lgd_code    = EXCLUDED.state_lgd_code,
                   block_name        = EXCLUDED.block_name,
                   is_active         = EXCLUDED.is_active
            """,
            final,
        )

    REJECTS.parent.mkdir(exist_ok=True)
    with REJECTS.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "dump_id", "block_lgd_code", "block_name", "state_lgd_code",
            "district_lgd_code", "is_active", "reason"])
        writer.writeheader()
        writer.writerows(sorted(rejected, key=lambda x: (x["reason"], x["dump_id"])))

    print(f"parsed {len(rows)}, loaded {len(final)}, rejected {len(rejected)} -> {REJECTS}")


if __name__ == "__main__":
    main()
