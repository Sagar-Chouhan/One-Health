from pydantic import BaseModel, ConfigDict, Field


class DistrictCreateRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    district_lgd_code: int = Field(gt=0)
    state_lgd_code: int = Field(gt=0)
    district_name: str = Field(min_length=1, max_length=100)
    division_name: str | None = Field(default=None, max_length=100)


class StateResponse(BaseModel):
    state_lgd_code: int
    state_name: str


class DistrictResponse(BaseModel):
    district_lgd_code: int
    state_lgd_code: int
    district_name: str
    division_name: str | None


class BlockResponse(BaseModel):
    block_lgd_code: int
    district_lgd_code: int
    state_lgd_code: int
    block_name: str


class GramPanchayatResponse(BaseModel):
    gram_panchayat_lgd_code: int
    block_lgd_code: int
    district_lgd_code: int
    state_lgd_code: int
    gram_panchayat_name: str
    local_body_type: str


class VillageResponse(BaseModel):
    village_lgd_code: int
    gram_panchayat_lgd_code: int
    block_lgd_code: int
    district_lgd_code: int
    state_lgd_code: int
    village_name: str
    village_type: str


class ProfessionResponse(BaseModel):
    profession_id: int
    profession_name: str


class EducationResponse(BaseModel):
    education_id: int
    education_name: str
