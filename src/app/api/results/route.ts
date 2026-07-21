import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { VOTE_OPTIONS } from "../../../lib/pollConfig";

export const dynamic = "force-dynamic";

type VoteRow = {
  option_id: string;
  is_invalid: boolean;
};

type PollSettingsRow = {
  results_public: boolean;
  reveal_started_at: string | null;
};

const getAdminPin = () => {
  return process.env.ADMIN_PIN;
};

const getPollSettings = async () => {
  const { data, error } = await supabaseAdmin
    .from("poll_settings")
    .select("results_public, reveal_started_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Poll settings read error:", error);
    throw new Error("결과 공개 설정을 불러오지 못했습니다.");
  }

  return (data ?? {
    results_public: false,
    reveal_started_at: null,
  }) as PollSettingsRow;
};

const getResultData = async () => {
  const { data, error } = await supabaseAdmin
    .from("votes")
    .select("option_id, is_invalid");

  if (error) {
    console.error("Results read error:", error);
    throw new Error("투표 결과를 불러오지 못했습니다.");
  }

  const rows = (data ?? []) as VoteRow[];
  const validRows = rows.filter((row) => !row.is_invalid);
  const totalValidVotes = validRows.length;

  const options = VOTE_OPTIONS.map((option) => {
    const voteCount = validRows.filter(
      (row) => row.option_id === option.id,
    ).length;

    const percent =
      totalValidVotes === 0
        ? 0
        : Math.round((voteCount / totalValidVotes) * 1000) / 10;

    return {
      ...option,
      voteCount,
      percent,
    };
  });

  const maxVoteCount = Math.max(...options.map((option) => option.voteCount), 0);

  const winners =
    maxVoteCount === 0
      ? []
      : options.filter((option) => option.voteCount === maxVoteCount);

  return {
    totalValidVotes,
    options,
    winners,
    hasTie: winners.length > 1,
  };
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const isPreview = url.searchParams.get("preview") === "1";

  try {
    const settings = await getPollSettings();

    if (isPreview) {
      const adminPin = getAdminPin();
      const requestPin = request.headers.get("x-admin-pin");

      if (!adminPin || requestPin !== adminPin) {
        return NextResponse.json(
          { message: "관리자 미리보기 권한이 없습니다." },
          { status: 401 },
        );
      }
    }

    if (!settings.results_public && !isPreview) {
      return NextResponse.json({
        isOpen: false,
        isPreview: false,
        message:
          "아직 결과 발표가 시작되지 않았습니다. 결과를 집계 중이니 선교사님들 잠시만 기다려주세요.",
      });
    }

    const resultData = await getResultData();

    return NextResponse.json({
      isOpen: true,
      isPreview,
      resultsPublic: settings.results_public,
      revealStartedAt: settings.reveal_started_at,
      ...resultData,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "결과 정보를 불러오지 못했습니다.";

    return NextResponse.json({ message }, { status: 500 });
  }
}