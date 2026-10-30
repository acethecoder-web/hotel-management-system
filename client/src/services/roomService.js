const API_URL = import.meta.env.VITE_API_URL;

async function request(path) {
  const response = await fetch(`${API_URL}${path}`);

  if (!response.ok) {
    let message = "Something went wrong";
    try {
      const data = await response.json();
      if (data.message) message = data.message;
    } catch {
    }
    throw new Error(message);
  }

  return response.json();
}

export function fetchRooms() {
  return request("/api/rooms");
}

export function fetchRoomById(id) {
  return request(`/api/rooms/${id}`);
}