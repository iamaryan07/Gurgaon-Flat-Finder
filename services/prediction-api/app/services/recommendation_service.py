from functools import lru_cache
from pathlib import Path

import joblib
import pandas as pd
from geopy.distance import geodesic
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import MinMaxScaler


class RecommendationService:
    """Society recommender backed by the packaged listing + geo-cache data.

    Three retrieval modes, matching the original Streamlit app:
      - location: listings within a geodesic radius of a landmark
      - similar: nearest neighbours on (bedroom, price, area)
      - hybrid: a weighted blend of geographic and configuration proximity
    """

    FEATURES = ["Bedroom", "Price", "Built Up Area"]

    def __init__(self, data_path: Path, landmark_path: Path, society_path: Path):
        self.df = (
            pd.read_csv(data_path)
            .drop(columns="Unnamed: 0", errors="ignore")
            .dropna(subset=["NearbyPlaces"])
        )

        landmarks = joblib.load(landmark_path)
        society_coords = joblib.load(society_path)

        self.df["Coordinates"] = (
            self.df["Property Name"].str.strip().str.lower()
            + ", "
            + self.df["Sector"].str.strip().str.lower()
            + ", gurgaon"
        ).map(society_coords)
        self.df = self.df[self.df["Coordinates"].notna()].copy()

        self.landmarks = {
            self._clean_landmark(key): value
            for key, value in landmarks.items()
            if value
        }

        self.scaler = MinMaxScaler()
        scaled = self.scaler.fit_transform(self.df[self.FEATURES])
        self.nn = NearestNeighbors(n_neighbors=10, algorithm="ball_tree").fit(scaled)

    @staticmethod
    def _clean_landmark(name: str) -> str:
        return name.replace(", gurgaon", "").strip("\"' ").capitalize()

    def landmark_names(self) -> list[str]:
        return sorted(self.landmarks)

    def location(self, landmark: str, radius: int) -> list[dict]:
        origin = self.landmarks[landmark]
        frame = self.df.copy()
        frame["distance_km"] = frame["Coordinates"].apply(
            lambda coords: geodesic(origin, coords).km
        )
        within = frame[frame["distance_km"] <= radius]
        within = within.sort_values("distance_km").drop_duplicates("Property Name").head(20)
        return self._records(within)

    def similar(self, property_name: str) -> list[dict]:
        source = (
            self.df[self.df["Property Name"] == property_name]
            .groupby("Bedroom")[["Price", "Built Up Area"]]
            .mean()
            .reset_index()
        )
        neighbours: list[int] = []
        for _, row in source.iterrows():
            point = self.scaler.transform(row[self.FEATURES].to_frame().T)
            _, indices = self.nn.kneighbors(point)
            neighbours.extend(indices[0])

        frame = self.df.iloc[neighbours]
        frame = frame[frame["Property Name"] != property_name]
        return self._records(frame.drop_duplicates("Property Name").head(10))

    def hybrid(self, property_name: str, preference: str) -> list[dict]:
        coordinates = self.df[self.df["Property Name"] == property_name]["Coordinates"].iloc[0]

        near = self.df.copy()
        near["distance_km"] = near["Coordinates"].apply(
            lambda coords: geodesic(coordinates, coords).km
        )
        near = (
            near[near["Property Name"] != property_name]
            .drop_duplicates("Property Name")
            .sort_values("distance_km")
            .head(10)
        )

        similar = self.similar(property_name)
        similar_rank = {item["property_name"]: index for index, item in enumerate(similar)}

        weights = (0.7, 0.3) if preference == "location" else (0.3, 0.7)
        near["score"] = [
            (10 - index) * weights[0]
            + (10 - similar_rank.get(name, 10)) * weights[1]
            for index, name in enumerate(near["Property Name"])
        ]
        return self._records(near.sort_values("score", ascending=False).head(5))

    def _records(self, frame: pd.DataFrame) -> list[dict]:
        return [
            {
                "property_name": row["Property Name"],
                "sector": row["Sector"],
                "price": float(row["Price"]),
                "area": int(row["Built Up Area"]),
                "bedroom": int(row["Bedroom"]),
                "url": row["URL"],
                "distance_km": round(float(row.get("distance_km", 0)), 2),
            }
            for _, row in frame.iterrows()
        ]

    def map_data(self) -> dict:
        """Return society + landmark coordinates for the geo map.

        Societies are deduplicated by name and averaged so each pin represents a
        distinct society coloured by its average asking price.
        """
        grouped = (
            self.df.groupby("Property Name", as_index=False)
            .agg(
                Sector=("Sector", "first"),
                price=("Price", "mean"),
                bedroom=("Bedroom", "mean"),
                area=("Built Up Area", "mean"),
                url=("URL", "first"),
                lat=("Coordinates", lambda coords: float(coords.iloc[0][0])),
                lon=("Coordinates", lambda coords: float(coords.iloc[0][1])),
            )
            .round(2)
        )

        properties = [
            {
                "name": row["Property Name"],
                "sector": row["Sector"],
                "price": float(row["price"]),
                "bedroom": float(row["bedroom"]),
                "area": float(row["area"]),
                "lat": float(row["lat"]),
                "lon": float(row["lon"]),
                "url": row["url"],
            }
            for _, row in grouped.iterrows()
        ]

        landmarks = [
            {
                "name": name,
                "lat": float(coords[0]),
                "lon": float(coords[1]),
            }
            for name, coords in self.landmarks.items()
        ]

        return {"properties": properties, "landmarks": landmarks}


@lru_cache
def get_recommendation_service(
    data_path: str, landmark_path: str, society_path: str
) -> RecommendationService:
    return RecommendationService(Path(data_path), Path(landmark_path), Path(society_path))
