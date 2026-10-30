function RoomCardSkeleton() {
  return (
    <div className="room-card" aria-hidden="true">
      <div className="room-card__media skeleton" />
      <div className="room-card__body">
        <div className="skeleton" style={{ height: 22, width: "60%" }} />
        <div className="skeleton" style={{ height: 16, width: "40%" }} />
        <div className="skeleton" style={{ height: 28, width: "30%" }} />
      </div>
    </div>
  );
}

export default RoomCardSkeleton;