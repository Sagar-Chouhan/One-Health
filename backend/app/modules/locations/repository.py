from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session


def _fetch_master(
	db: Session,
	query: str,
	params: dict[str, int] | None = None,
) -> list[dict[str, Any]]:
	rows = db.execute(text(query), params or {}).mappings().all()
	return [dict(row) for row in rows]


def list_states(db: Session) -> list[dict[str, Any]]:
	return _fetch_master(
		db,
		"""
		SELECT state_lgd_code, state_name
		FROM public.state_master
		WHERE is_active
		ORDER BY state_name
		""",
	)


def list_districts(db: Session, state_lgd_code: int) -> list[dict[str, Any]]:
	return _fetch_master(
		db,
		"""
		SELECT district_lgd_code, state_lgd_code, district_name, division_name
		FROM public.district_master
		WHERE state_lgd_code = :state_lgd_code AND is_active
		ORDER BY district_name
		""",
		{"state_lgd_code": state_lgd_code},
	)


def is_active_state(db: Session, state_lgd_code: int) -> bool:
	return db.execute(
		text(
			"""
			SELECT 1
			FROM public.state_master
			WHERE state_lgd_code = :state_lgd_code AND is_active
			"""
		),
		{"state_lgd_code": state_lgd_code},
	).scalar_one_or_none() is not None


def create_district(
	db: Session,
	*,
	district_lgd_code: int,
	state_lgd_code: int,
	district_name: str,
	division_name: str | None,
) -> dict[str, Any]:
	try:
		row = db.execute(
			text(
				"""
				INSERT INTO public.district_master (
					district_lgd_code,
					state_lgd_code,
					district_name,
					division_name
				)
				VALUES (
					:district_lgd_code,
					:state_lgd_code,
					:district_name,
					:division_name
				)
				RETURNING district_lgd_code, state_lgd_code, district_name, division_name
				"""
			),
			{
				"district_lgd_code": district_lgd_code,
				"state_lgd_code": state_lgd_code,
				"district_name": district_name,
				"division_name": division_name,
			},
		).mappings().one()
		db.commit()
		return dict(row)
	except IntegrityError as exc:
		db.rollback()
		raise HTTPException(
			status_code=status.HTTP_409_CONFLICT,
			detail=(
				"District LGD code, or district name for this state, already exists."
			),
		) from exc
	except SQLAlchemyError as exc:
		db.rollback()
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail="District could not be created.",
		) from exc


def list_blocks(db: Session, district_lgd_code: int) -> list[dict[str, Any]]:
	return _fetch_master(
		db,
		"""
		SELECT block_lgd_code, district_lgd_code, state_lgd_code, block_name
		FROM public.block_master
		WHERE district_lgd_code = :district_lgd_code AND is_active
		ORDER BY block_name
		""",
		{"district_lgd_code": district_lgd_code},
	)


def list_gram_panchayats(db: Session, block_lgd_code: int) -> list[dict[str, Any]]:
	return _fetch_master(
		db,
		"""
		SELECT
			gram_panchayat_lgd_code,
			block_lgd_code,
			district_lgd_code,
			state_lgd_code,
			gram_panchayat_name,
			local_body_type
		FROM public.gram_panchayat_master
		WHERE block_lgd_code = :block_lgd_code AND is_active
		ORDER BY gram_panchayat_name
		""",
		{"block_lgd_code": block_lgd_code},
	)


def list_villages(db: Session, gram_panchayat_lgd_code: int) -> list[dict[str, Any]]:
	return _fetch_master(
		db,
		"""
		SELECT
			village_lgd_code,
			gram_panchayat_lgd_code,
			block_lgd_code,
			district_lgd_code,
			state_lgd_code,
			village_name,
			village_type
		FROM public.village_master
		WHERE gram_panchayat_lgd_code = :gram_panchayat_lgd_code AND is_active
		ORDER BY village_name
		""",
		{"gram_panchayat_lgd_code": gram_panchayat_lgd_code},
	)


def list_professions(db: Session) -> list[dict[str, Any]]:
	return _fetch_master(
		db,
		"""
		SELECT profession_id, profession_name
		FROM public.profession_master
		WHERE is_active
		ORDER BY sort_order, profession_name
		""",
	)


def list_educations(db: Session) -> list[dict[str, Any]]:
	return _fetch_master(
		db,
		"""
		SELECT education_id, education_name
		FROM public.education_master
		WHERE is_active
		ORDER BY sort_order, education_name
		""",
	)
