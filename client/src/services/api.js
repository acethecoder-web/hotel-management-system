const API_URL = import.meta.env.VITE_API_URL;

export async function api(path, { method = "GET", body } = {}) {
  const isForm = body instanceof FormData; 

  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers: body && !isForm ? { "Content-Type": "application/json" } : undefined,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
  }

  if (!response.ok) {
    const error = new Error(data?.message || "Something went wrong");
    error.status = response.status;
    error.code = data?.code;
    error.warnings = data?.warnings;
    throw error;
  }
  return data;
}