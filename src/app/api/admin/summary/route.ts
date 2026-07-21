import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import {
  getIsPollClosed,
  POLL_CLOSE_AT,
  POLL_CLOSE_AT_LABEL,
  VOTE_OPTIONS,
} from "../../../../lib/pollConfig";

export const dynamic = "force-dynamic";

type VoteRow = {
  id: string;
  generation: string;
  voter_name: string;
  phone_last4: string;
  option_id: string;
  is_invalid: boolean;
  created_at: string;
};

type PollSettingsRow = {
  results_public: boolean;
  reveal_started_at: string | null;
};

const getAdminPin = () => {
  return process.env.ADMIN_PIN;
};

const readPollSettings = async () => {
  const { data, error } = await supabaseAdmin
    .from("poll_settings")
    .select("results_public, reveal_started_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Admin settings error:", error);
    throw new Error("결과 발표 설정을 불러오지 못했습니다.");
  }

  return (data ?? {
    results_public: false,
    reveal_started_at: null,
  }) as PollSettingsRow;
};

export async function GET(request: Request) {
  const adminPin = getAdminPin();

  if (!adminPin) {
    return NextResponse.json(
      { message: "ADMIN_PIN이 설정되어 있지 않습니다." },
      { status: 500 },
    );
  }

  const requestPin = request.headers.get("x-admin-pin");

  if (requestPin !== adminPin) {
    return NextResponse.json(
      { message: "관리자 PIN이 올바르지 않습니다." },
      { status: 401 },
    );
  }

  try {
    const [settingsResult, votesResult] = await Promise.all([
      readPollSettings(),
      supabaseAdmin
        .from("votes")
        .select(
          "id, generation, voter_name, phone_last4, option_id, is_invalid, created_at",
        )
        .order("created_at", { ascending: false }),
    ]);

    if (votesResult.error) {
      console.error("Admin summary error:", votesResult.error);

      return NextResponse.json(
        { message: "투표 집계를 불러오지 못했습니다." },
        { status: 500 },
      );
    }

    const rows = (votesResult.data ?? []) as VoteRow[];
    const validRows = rows.filter((row) => !row.is_invalid);
    const invalidRows = rows.filter((row) => row.is_invalid);
    const totalValidVotes = validRows.length;

    const options = VOTE_OPTIONS.map((option) => {
      const optionRows = validRows.filter((row) => row.option_id === option.id);
      const voteCount = optionRows.length;

      const percent =
        totalValidVotes === 0
          ? 0
          : Math.round((voteCount / totalValidVotes) * 1000) / 10;

      return {
        ...option,
        voteCount,
        percent,
        voters: optionRows.map((row) => ({
          id: row.id,
          generation: row.generation,
          name: row.voter_name,
          phoneLast4: row.phone_last4,
          createdAt: row.created_at,
        })),
      };
    });

    return NextResponse.json({
      pollClosesAt: POLL_CLOSE_AT,
      pollClosesAtLabel: POLL_CLOSE_AT_LABEL,
      isPollClosed: getIsPollClosed(),
      resultsPublic: settingsResult.results_public,
      revealStartedAt: settingsResult.reveal_started_at,
      totalSubmittedVotes: rows.length,
      totalValidVotes,
      totalInvalidVotes: invalidRows.length,
      options,
      lastUpdatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "관리자 데이터를 불러오지 못했습니다.";

    return NextResponse.json({ message }, { status: 500 });
  }
}