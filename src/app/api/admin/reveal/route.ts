import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type RevealRequestBody = {
  action?: "start" | "hide";
};

type PollSettingsUpsert = {
  id: number;
  results_public: boolean;
  reveal_started_at: string | null;
  updated_at: string;
};

type PollSettingsResponse = {
  results_public: boolean;
  reveal_started_at: string | null;
  updated_at: string | null;
};

const getAdminPin = () => {
  return process.env.ADMIN_PIN;
};

const checkAdminPin = (request: Request) => {
  const adminPin = getAdminPin();
  const requestPin = request.headers.get("x-admin-pin");

  return Boolean(adminPin && requestPin === adminPin);
};

const readSettings = async () => {
  const { data, error } = await supabaseAdmin
    .from("poll_settings")
    .select("results_public, reveal_started_at, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Reveal settings read error:", error);
    throw new Error("결과 발표 설정을 불러오지 못했습니다.");
  }

  return (
    data ?? {
      results_public: false,
      reveal_started_at: null,
      updated_at: null,
    }
  ) as PollSettingsResponse;
};

export async function GET(request: Request) {
  if (!checkAdminPin(request)) {
    return NextResponse.json(
      { message: "관리자 PIN이 올바르지 않습니다." },
      { status: 401 },
    );
  }

  try {
    const settings = await readSettings();

    return NextResponse.json({
      resultsPublic: settings.results_public,
      revealStartedAt: settings.reveal_started_at,
      updatedAt: settings.updated_at,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "결과 발표 설정을 불러오지 못했습니다.";

    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!checkAdminPin(request)) {
    return NextResponse.json(
      { message: "관리자 PIN이 올바르지 않습니다." },
      { status: 401 },
    );
  }

  let body: RevealRequestBody;

  try {
    body = (await request.json()) as RevealRequestBody;
  } catch {
    return NextResponse.json(
      { message: "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (body.action !== "start" && body.action !== "hide") {
    return NextResponse.json(
      { message: "결과 발표 동작이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  const nextSettings: PollSettingsUpsert = {
    id: 1,
    results_public: body.action === "start",
    reveal_started_at: body.action === "start" ? now : null,
    updated_at: now,
  };

  const { data, error } = await supabaseAdmin
    .from("poll_settings")
    .upsert(nextSettings, { onConflict: "id" })
    .select("results_public, reveal_started_at, updated_at")
    .single();

  if (error) {
    console.error("Reveal settings update error:", error);

    return NextResponse.json(
      { message: "결과 발표 설정을 저장하지 못했습니다." },
      { status: 500 },
    );
  }

  const settings = data as PollSettingsResponse;

  return NextResponse.json({
    resultsPublic: settings.results_public,
    revealStartedAt: settings.reveal_started_at,
    updatedAt: settings.updated_at,
  });
}