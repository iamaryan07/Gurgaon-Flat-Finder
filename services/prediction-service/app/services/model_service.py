from functools import lru_cache

import joblib
import numpy as np
import pandas as pd
from huggingface_hub import hf_hub_download

from app.schemas.prediction import PredictionRequest

# Feature names the trained sklearn Pipeline expects, in the exact order the
# training DataFrame used. ColumnTransformer selects columns by name, but the
# "remainder" passthrough columns keep their DataFrame order, so this order is
# significant and must match the training data exactly.
FEATURE_ORDER = [
    "Sector",
    "Built Up Area",
    "Bedroom",
    "Bathroom",
    "Balcony",
    "Servant Room",
    "Store Room",
    "Study Room",
    "Floor Num",
    "Total Floor",
    "Property Age",
    "Furnishing",
    "Power Backup",
    "Covered_Parking",
    "Open_Parking",
    "Total Parking",
    "Rating",
    "Nearby",
    "Overlooking",
]

_ORDINAL_FEATURES = ["Property Age", "Power Backup", "Furnishing"]
_ONEHOT_FEATURES = ["Nearby", "Overlooking", "Sector"]
_NUMERICAL_FEATURES = [
    "Built Up Area",
    "Bedroom",
    "Bathroom",
    "Balcony",
    "Total Floor",
    "Floor Num",
    "Rating",
]


class ModelService:
    """Downloads the property-price model from Hugging Face Hub and exposes real inference."""

    def __init__(self, repo_id: str, filename: str):
        self.repo_id = repo_id
        self.filename = filename
        self.model = None

    def load(self) -> None:
        try:
            local_path = hf_hub_download(repo_id=self.repo_id, filename=self.filename)
        except Exception as error:
            raise FileNotFoundError(
                f"Model artifact could not be downloaded: {self.repo_id}/{self.filename}"
            ) from error
        self.model = joblib.load(local_path)

    def predict(self, request: PredictionRequest) -> float:
        if self.model is None:
            raise RuntimeError("Model is not loaded")
        values = request.model_dump()
        frame = pd.DataFrame(
            [
                {
                    "Sector": values["sector"],
                    "Built Up Area": values["built_up_area"],
                    "Bedroom": values["bedroom"],
                    "Bathroom": values["bathroom"],
                    "Balcony": values["balcony"],
                    "Servant Room": int(values["servant_room"]),
                    "Store Room": int(values["store_room"]),
                    "Study Room": int(values["study_room"]),
                    "Floor Num": values["floor_num"],
                    "Total Floor": values["total_floor"],
                    "Property Age": values["property_age"],
                    "Furnishing": values["furnishing"],
                    "Power Backup": values["power_backup"],
                    "Covered_Parking": values["covered_parking"],
                    "Open_Parking": values["open_parking"],
                    "Total Parking": values["covered_parking"] + values["open_parking"],
                    "Rating": values["rating"],
                    "Nearby": values["nearby"],
                    "Overlooking": values["overlooking"],
                }
            ],
            columns=FEATURE_ORDER,
        )
        return float(self.model.predict(frame)[0])

    def metadata(self) -> dict:
        """Return the exact categorical values the model was trained on.

        The frontend drives its dropdowns from these values so the UI can
        never drift from what the encoder understands.
        """
        if self.model is None:
            raise RuntimeError("Model is not loaded")
        preprocessor = self.model.named_steps["preprocessor"]
        ordinal = preprocessor.named_transformers_["ordinal"]
        onehot = preprocessor.named_transformers_["onehot"]

        ordinal_map = {
            name: list(categories)
            for name, categories in zip(ordinal.feature_names_in_, ordinal.categories_)
        }
        onehot_map = {
            name: list(categories)
            for name, categories in zip(onehot.feature_names_in_, onehot.categories_)
        }

        return {
            "property_age": ordinal_map.get("Property Age", []),
            "power_backup": ordinal_map.get("Power Backup", []),
            "furnishing": ordinal_map.get("Furnishing", []),
            "nearby": onehot_map.get("Nearby", []),
            "overlooking": onehot_map.get("Overlooking", []),
            "sectors": onehot_map.get("Sector", []),
        }

    def feature_importances(self) -> list[dict]:
        """Compute real feature importances from the trained regressor.

        One-hot encoded columns are rolled back up into their parent feature
        so the list contains one entry per original input column.
        """
        if self.model is None:
            raise RuntimeError("Model is not loaded")
        preprocessor = self.model.named_steps["preprocessor"]
        regressor = self.model.named_steps["regressor"]

        importances = np.asarray(regressor.regressor_.feature_importances_, dtype=float)
        names = preprocessor.get_feature_names_out()

        aggregated: dict[str, float] = {}
        for name, importance in zip(names, importances):
            parent = self._parent_feature(name)
            aggregated[parent] = aggregated.get(parent, 0.0) + float(importance)

        ranked = sorted(aggregated.items(), key=lambda item: item[1], reverse=True)
        return [
            {"feature": feature, "importance": round(importance, 5)}
            for feature, importance in ranked
        ]

    @staticmethod
    def _parent_feature(transformed_name: str) -> str:
        prefix, _, rest = transformed_name.partition("__")
        if prefix in {"ordinal", "numerical", "remainder"}:
            return rest
        if prefix == "onehot":
            for parent in _ONEHOT_FEATURES:
                if rest.startswith(parent + "_"):
                    return parent
            return rest
        return transformed_name


@lru_cache
def get_model_service(repo_id: str, filename: str) -> ModelService:
    service = ModelService(repo_id, filename)
    service.load()
    return service
