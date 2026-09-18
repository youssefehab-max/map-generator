import { Building, PathData, AuthUser } from "./types";

const API_URL = /*import.meta.env.VITE_API_URL || */"http://localhost:3000";

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.message || `Request failed with status ${res.status}`);
  }
  return body;
}

export const api = {
  async getBuildings(): Promise<Building[]> {
    const res = await fetch(`${API_URL}/buildings`);
    const body = await handle<{ data: Building[] }>(res);
    return body.data;
  },

  async getBuilding(id: string): Promise<Building> {
    const res = await fetch(`${API_URL}/buildings/${id}`);
    const body = await handle<{ data: Building }>(res);
    return body.data;
  },

  async deleteBuilding(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/buildings/${id}`, {
    method: "DELETE",
    headers: {
      ...authHeader(),
    },
  });

  await handle(res);
},

  async getPath(buildingId: string, start: string, end: string): Promise<PathData> {
    const res = await fetch(
      `${API_URL}/buildings/${buildingId}/path?start=${encodeURIComponent(
        start
      )}&end=${encodeURIComponent(end)}`
    );
    const body = await handle<{ data: PathData }>(res);
    return body.data;
  },

  async createBuilding(form: FormData): Promise<Building> {
    const res = await fetch(`${API_URL}/buildings`, {
      method: "POST",
      headers: { ...authHeader() },
      body: form,
    });
    const body = await handle<{ data: Building }>(res);
    return body.data;
  },

  async login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return handle(res);
  },

  async register(username: string, email: string, password: string): Promise<{ message: string }> {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    return handle(res);
  },
};

/** Generates a 24-hex-char id, matching what Mongoose uses for ObjectIds,
 *  so nodes created client-side can reference each other in adjacency
 *  lists before the building is ever saved to the database. */
export function generateId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
