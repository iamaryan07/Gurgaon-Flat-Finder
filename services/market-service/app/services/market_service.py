from functools import lru_cache
from pathlib import Path

import pandas as pd


class MarketService:
    """Read-only market intelligence derived from the packaged dataset."""

    def __init__(self, data_path: Path):
        self.data_path = data_path
        self.data = pd.read_parquet(data_path)
        for column in self.data.select_dtypes(include=["float32"]).columns:
            self.data[column] = self.data[column].astype("float64")

    def overview(self) -> dict:
        df = self.data
        return {
            "properties": int(len(df)),
            "sectors": int(df["Sector"].nunique()),
            "average_price": round(float(df["Price"].mean()), 2),
            "median_price": round(float(df["Price"].median()), 2),
            "average_area": round(float(df["Built Up Area"].mean())),
            "average_price_per_sqft": round(float((df["Price"] * 10_000_000 / df["Built Up Area"]).mean())),
        }

    def sectors(self) -> list[dict]:
        summary = (
            self.data.groupby("Sector")
            .agg(
                average_price=("Price", "mean"),
                median_price=("Price", "median"),
                average_area=("Built Up Area", "mean"),
                average_rating=("Rating", "mean"),
                average_price_per_sqft=("Price", lambda s: float((s * 10_000_000 / self.data.loc[s.index, "Built Up Area"]).mean())),
                listings=("Price", "size"),
            )
            .reset_index()
        )
        summary = summary.round(2).sort_values("average_price", ascending=False)
        return summary.to_dict(orient="records")

    def analytics(self) -> dict:
        df = self.data.copy()
        df["Extra Rooms"] = df["Study Room"] + df["Store Room"] + df["Servant Room"]
        age = {"10+ Year Old": 0, "5 to 10 Year Old": 1, "1 to 5 Year Old": 2, "0 to 1 Year Old": 3}
        furnish = {"Unfurnished": 0, "Semi Furnished": 1, "Furnished": 2}
        power = {"None": 0, "Partial": 1, "Full": 2}
        df["Modernity"] = df["Property Age"].map(age)
        df["Furnishing Level"] = df["Furnishing"].map(furnish)
        df["Power Backup Level"] = df["Power Backup"].map(power)
        df["Price Per Sqft"] = df["Price"] * 10_000_000 / df["Built Up Area"]

        cols = [
            "Price",
            "Built Up Area",
            "Rating",
            "Total Parking",
            "Extra Rooms",
            "Modernity",
            "Furnishing Level",
            "Power Backup Level",
            "Price Per Sqft",
        ]
        stats = df.groupby("Sector")[cols].mean().round(3).reset_index()

        record_cols = [
            "Sector",
            "Price",
            "Built Up Area",
            "Bedroom",
            "Bathroom",
            "Balcony",
            "Floor Num",
            "Total Floor",
            "Property Age",
            "Furnishing",
            "Power Backup",
            "Total Parking",
            "Rating",
            "Servant Room",
            "Store Room",
            "Study Room",
            "Extra Rooms",
            "Modernity",
            "Furnishing Level",
            "Power Backup Level",
            "Price Per Sqft",
        ]
        records = (
            df[record_cols]
            .sample(min(1500, len(df)), random_state=42)
            .to_dict(orient="records")
        )

        return {
            "sector_stats": stats.to_dict(orient="records"),
            "records": records,
            "sectors": sorted(df["Sector"].unique().tolist()),
        }

    def recommendations(self, sector: str, bedroom: int, budget: float) -> list[dict]:
        df = self.data
        groups = (
            df.groupby("Sector")
            .agg(
                price=("Price", "mean"),
                area=("Built Up Area", "mean"),
                rating=("Rating", "mean"),
                bedrooms=("Bedroom", "mean"),
                listings=("Price", "size"),
            )
            .reset_index()
        )
        groups = groups[groups["Sector"] != sector].copy()
        price_penalty = ((groups["price"] - budget).abs() / max(budget, 0.1)) * 55
        bedroom_penalty = (groups["bedrooms"] - bedroom).abs() * 18
        groups["match_score"] = (100 - (price_penalty + bedroom_penalty)).clip(upper=95)
        return (
            groups.sort_values("match_score", ascending=False)
            .head(6)
            .round(2)
            .to_dict(orient="records")
        )

    def insights(self) -> dict:
        df = self.data
        df = df.assign(price_per_sqft=df["Price"] * 10_000_000 / df["Built Up Area"])
        min_listings = 8

        price_by_bedroom = (
            df.groupby("Bedroom")["Price"]
            .agg(average="mean", median="median", minimum="min", maximum="max", count="size")
            .round(2)
            .reset_index()
            .to_dict(orient="records")
        )

        price_by_furnishing = (
            df.groupby("Furnishing")["Price"]
            .agg(average="mean", median="median", count="size")
            .round(2)
            .reset_index()
            .to_dict(orient="records")
        )

        price_by_age = (
            df.groupby("Property Age")["Price"]
            .agg(average="mean", median="median", count="size")
            .round(2)
            .reset_index()
            .to_dict(orient="records")
        )

        def sector_segments(metric: str, ascending: bool, top: int = 5) -> list[dict]:
            grouped = (
                df.groupby("Sector")
                .agg(
                    average_price=("Price", "mean"),
                    average_price_per_sqft=("price_per_sqft", "mean"),
                    average_rating=("Rating", "mean"),
                    listings=("Price", "size"),
                )
                .reset_index()
            )
            grouped = grouped[grouped["listings"] >= min_listings]
            return (
                grouped.sort_values(metric, ascending=ascending)
                .head(top)
                .round(2)
                .to_dict(orient="records")
            )

        supply = (
            df.groupby("Sector")
            .agg(listings=("Price", "size"), average_price=("Price", "mean"))
            .round(2)
            .reset_index()
            .sort_values("listings", ascending=False)
            .head(8)
            .to_dict(orient="records")
        )

        numeric = [
            "Built Up Area",
            "Bedroom",
            "Bathroom",
            "Balcony",
            "Floor Num",
            "Total Floor",
            "Total Parking",
            "Rating",
        ]
        drivers = [
            {"feature": column, "correlation": round(float(df[column].corr(df["Price"])), 4)}
            for column in numeric
        ]
        drivers = sorted(drivers, key=lambda d: abs(d["correlation"]), reverse=True)

        return {
            "overview": self.overview(),
            "price_quantiles": {
                "min": round(float(df["Price"].min()), 2),
                "p25": round(float(df["Price"].quantile(0.25)), 2),
                "median": round(float(df["Price"].median()), 2),
                "p75": round(float(df["Price"].quantile(0.75)), 2),
                "max": round(float(df["Price"].max()), 2),
            },
            "price_by_bedroom": price_by_bedroom,
            "price_by_furnishing": price_by_furnishing,
            "price_by_age": price_by_age,
            "expensive_sectors": sector_segments("average_price", ascending=False),
            "affordable_sectors": sector_segments("average_price", ascending=True),
            "best_value_sectors": sector_segments("average_price_per_sqft", ascending=True),
            "supply_concentration": supply,
            "price_drivers": drivers,
        }


@lru_cache
def get_market_service(data_path: str) -> MarketService:
    return MarketService(Path(data_path))
