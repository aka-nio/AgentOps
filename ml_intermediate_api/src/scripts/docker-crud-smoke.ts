const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

type Candidate = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

type ListResponse = {
  data: Candidate[];
  total: number;
  limit: number;
  offset: number;
};

const testEmail = `jane.${Date.now()}@example.com`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const raw = await response.text();
  const payload = raw ? (JSON.parse(raw) as unknown) : null;

  if (!response.ok) {
    throw new Error(
      `Request failed (${response.status}) for ${path}: ${JSON.stringify(payload)}`
    );
  }

  return payload as T;
}

async function run() {
  console.log(`[smoke] Using base URL: ${baseUrl}`);

  const health = await request<{ ok: boolean }>("/health");
  if (!health.ok) {
    throw new Error("Health check did not return ok=true");
  }
  console.log("[smoke] Health check passed");

  const before = await request<ListResponse>("/api/candidate");
  console.log(`[smoke] Initial candidates total: ${before.total}`);

  const created = await request<Candidate>("/api/candidate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Jane Doe",
      email: testEmail,
    }),
  });
  console.log(`[smoke] Created candidate: ${created.id}`);

  const fetched = await request<Candidate>(`/api/candidate?id=${created.id}`);
  if (fetched.id !== created.id || fetched.email !== testEmail) {
    throw new Error("Fetched candidate does not match created candidate");
  }
  console.log("[smoke] Read candidate passed");

  const updated = await request<Candidate>(`/api/candidate/${created.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Jane D." }),
  });
  if (updated.name !== "Jane D.") {
    throw new Error("Update candidate did not persist expected name");
  }
  console.log("[smoke] Update candidate passed");

  const deleted = await request<Candidate>(`/api/candidate/${created.id}`, {
    method: "DELETE",
  });
  if (deleted.id !== created.id) {
    throw new Error("Delete candidate response returned unexpected ID");
  }
  console.log("[smoke] Delete candidate passed");

  const after = await request<ListResponse>("/api/candidate");
  const stillExists = after.data.some((candidate) => candidate.id === created.id);
  if (stillExists) {
    throw new Error("Deleted candidate still exists in list response");
  }

  console.log("[smoke] Final list check passed");
  console.log("[smoke] Docker CRUD smoke test passed");
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[smoke] FAILED: ${message}`);
  process.exit(1);
});
