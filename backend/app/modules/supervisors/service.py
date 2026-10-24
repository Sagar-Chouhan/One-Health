import logging

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import DUMMY_PIN_HASH, create_access_token, verify_pin
from app.modules.supervisors import repository
from app.modules.supervisors.schemas import SupervisorLoginRequest

logger = logging.getLogger(__name__)

INVALID = "Incorrect e-mail or password."


def login(db: Session, data: SupervisorLoginRequest) -> dict:
    """Sign a COHV supervisor in with e-mail and password. Only an active
    account gets a token (role SUPERVISOR)."""
    sup = repository.find_by_email(db, data.email)

    if sup is None:
        verify_pin(data.password, DUMMY_PIN_HASH)  # equal timing to a wrong password
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, INVALID)

    if not sup["password_hash"] or not verify_pin(data.password, sup["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, INVALID)

    if not sup["is_active"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This supervisor account is inactive.")

    token, expires_in = create_access_token(sup["supervisor_id"], sup["supervisor_code"], role="SUPERVISOR")
    logger.info("Supervisor %s signed in", sup["supervisor_code"])

    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": expires_in,
        "supervisor": {
            "supervisor_id": sup["supervisor_id"],
            "supervisor_code": sup["supervisor_code"],
            "supervisor_name": sup["supervisor_name"],
            "designation": sup["designation"],
            "department_name": sup["department_name"],
            "email": sup["email"],
            "state_lgd_code": sup["state_lgd_code"],
            "state_name": sup["state_name"],
            "district_lgd_code": sup["district_lgd_code"],
            "district_name": sup["district_name"],
            "block_lgd_code": sup["block_lgd_code"],
            "block_name": sup["block_name"],
        },
    }
