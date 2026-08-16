from pydantic import BaseModel, Field, model_validator


class PredictionRequest(BaseModel):
    sector: str
    built_up_area: int = Field(ge=300, le=20000)
    bedroom: int = Field(ge=1, le=10)
    bathroom: int = Field(ge=1, le=10)
    balcony: int = Field(ge=0, le=10)
    floor_num: int = Field(ge=0, le=150)
    total_floor: int = Field(ge=1, le=150)
    property_age: str
    furnishing: str
    power_backup: str
    covered_parking: int = Field(ge=0, le=10)
    open_parking: int = Field(ge=0, le=10)
    rating: float = Field(ge=1, le=5)
    nearby: str
    overlooking: str
    servant_room: bool = False
    store_room: bool = False
    study_room: bool = False

    @model_validator(mode="after")
    def validate_floors(self):
        if self.floor_num > self.total_floor:
            raise ValueError("floor_num cannot be higher than total_floor")
        return self


class PredictionResponse(BaseModel):
    predicted_price_crore: float
    predicted_price_lakh: float
    model_version: str
