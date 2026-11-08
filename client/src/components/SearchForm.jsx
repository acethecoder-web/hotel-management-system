import { useState } from "react";
import { addDays, todayISO } from "../utils/dates";

function SearchForm({ initial, hasSearch, onSearch, onClear }) {
  const today = todayISO();
  const [checkIn, setCheckIn] = useState(initial.checkIn);
  const [checkOut, setCheckOut] = useState(initial.checkOut);
  const [guests, setGuests] = useState(initial.guests);
  const [error, setError] = useState("");

  function handleCheckIn(e) {
    const value = e.target.value;
    setCheckIn(value);
    // keep check-out valid: move it to the next day if it's now too early
    if (value && (!checkOut || checkOut <= value))
      setCheckOut(addDays(value, 1));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!checkIn || !checkOut) return setError("Choose both dates");
    if (checkOut <= checkIn)
      return setError("Check-out must be after check-in");
    setError("");
    onSearch({ checkIn, checkOut, guests });
  }

  function handleClear() {
    setCheckIn("");
    setCheckOut("");
    setGuests("1");
    setError("");
    onClear();
  }

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="sf-in">Check-in</label>
        <input
          id="sf-in"
          type="date"
          min={today}
          value={checkIn}
          onChange={handleCheckIn}
        />
      </div>
      <div className="field">
        <label htmlFor="sf-out">Check-out</label>
        <input
          id="sf-out"
          type="date"
          min={checkIn ? addDays(checkIn, 1) : today}
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="sf-guests">Guests</label>
        <select
          id="sf-guests"
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="search-form__actions">
        <button className="btn btn--primary">Search</button>
        {hasSearch && (
          <button
            type="button"
            className="btn btn--outline"
            onClick={handleClear}
          >
            Clear
          </button>
        )}
      </div>
      {error && <div className="field__error search-form__error">{error}</div>}
    </form>
  );
}

export default SearchForm;
