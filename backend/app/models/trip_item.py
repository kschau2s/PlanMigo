import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.session import Base


class TripItemType(str, enum.Enum):
    FLIGHT = "flight"
    STAY = "stay"
    ACTIVITY = "activity"
    RESTAURANT = "restaurant"


class TripItem(Base):
    __tablename__ = "trip_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_plan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("trip_plans.id"), nullable=False)
    type: Mapped[TripItemType] = mapped_column(Enum(TripItemType), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    day: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    trip_plan: Mapped["TripPlan"] = relationship(back_populates="items")
