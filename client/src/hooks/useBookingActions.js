import { useState } from "react";
import { useAuth } from "./useAuth";
import { useConfirm } from "./useConfirm";
import { checkInRequest, checkOutRequest } from "../services/adminService";

export function useBookingActions(onDone) {
  const { setUser } = useAuth();
  const confirm = useConfirm();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  function handleFailure(err) {
    if (err.status === 401) setUser(null);
    else {
      setError(err.message);
      onDone?.(); 
    }
  }

  async function checkIn(booking) {
    setError("");
    setBusyId(booking.id);
    try {
      try {
        await checkInRequest(booking.id, false);
      } catch (err) {
        if (err.code !== "CHECKIN_WARNING") throw err;
        const ok = await confirm({
          title: `Check in ${booking.guest?.name ?? "this guest"} anyway?`,
          message: err.warnings.join(" "),
          confirmLabel: "Check in anyway",
        });
        if (!ok) return;
        await checkInRequest(booking.id, true);
      }
      onDone?.();
    } catch (err) {
      handleFailure(err);
    } finally {
      setBusyId(null);
    }
  }

  async function checkOut(booking) {
    const ok = await confirm({
      title: `Check out ${booking.guest?.name ?? "this guest"}?`,
      message: `Room ${booking.room?.roomNumber} will be marked as needing cleaning.`,
      confirmLabel: "Check out",
    });
    if (!ok) return;

    setError("");
    setBusyId(booking.id);
    try {
      await checkOutRequest(booking.id);
      onDone?.();
    } catch (err) {
      handleFailure(err);
    } finally {
      setBusyId(null);
    }
  }

  return { checkIn, checkOut, busyId, error };
}

export default useBookingActions;