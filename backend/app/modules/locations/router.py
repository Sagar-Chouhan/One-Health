from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.modules.locations import repository
from app.modules.locations.schemas import (
	BlockResponse,
	DistrictCreateRequest,
	DistrictResponse,
	EducationResponse,
	GramPanchayatResponse,
	ProfessionResponse,
	StateResponse,
	VillageResponse,
)

router = APIRouter(
	prefix="/api/locations",
	tags=["Location Masters"],
)

# Every location is addressed by its LGD code. LGD codes are unique within a
# level, so each list only needs its immediate parent's code.


@router.get("/states", response_model=list[StateResponse])
def get_states(db: Session = Depends(get_db)):
	return repository.list_states(db)


@router.get("/districts", response_model=list[DistrictResponse])
def get_districts(
	state_lgd_code: int = Query(gt=0),
	db: Session = Depends(get_db),
):
	return repository.list_districts(db, state_lgd_code)


@router.post(
	"/districts",
	response_model=DistrictResponse,
	status_code=status.HTTP_201_CREATED,
)
def create_district(
	data: DistrictCreateRequest,
	db: Session = Depends(get_db),
):
	if not repository.is_active_state(db, data.state_lgd_code):
		raise HTTPException(
			status_code=422,
			detail="state_lgd_code is invalid or inactive.",
		)

	return repository.create_district(
		db,
		district_lgd_code=data.district_lgd_code,
		state_lgd_code=data.state_lgd_code,
		district_name=data.district_name,
		division_name=data.division_name,
	)


@router.get("/blocks", response_model=list[BlockResponse])
def get_blocks(
	district_lgd_code: int = Query(gt=0),
	db: Session = Depends(get_db),
):
	return repository.list_blocks(db, district_lgd_code)


@router.get("/gram-panchayats", response_model=list[GramPanchayatResponse])
def get_gram_panchayats(
	block_lgd_code: int = Query(gt=0),
	db: Session = Depends(get_db),
):
	return repository.list_gram_panchayats(db, block_lgd_code)


@router.get("/villages", response_model=list[VillageResponse])
def get_villages(
	gram_panchayat_lgd_code: int = Query(gt=0),
	db: Session = Depends(get_db),
):
	return repository.list_villages(db, gram_panchayat_lgd_code)


@router.get("/professions", response_model=list[ProfessionResponse])
def get_professions(db: Session = Depends(get_db)):
	return repository.list_professions(db)


@router.get("/educations", response_model=list[EducationResponse])
def get_educations(db: Session = Depends(get_db)):
	return repository.list_educations(db)