import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import {
  getIsPollClosed,
  POLL_CLOSED_MESSAGE,
  VALID_OPTION_IDS,
  VOTE_OPTIONS,
} from "../../../lib/pollConfig";

type VoteRequestBody = {
  generation?: unknown;
  name?: unknown;
  phoneLast4?: unknown;
  optionId?: unknown;
};

type ExistingVoteRow = {
  option_id: string;
  created_at: string;
};

const onlyNumbers = (value: string) => {
  return value.replace(/[^0-9]/g, "");
};

const cleanName = (value: string) => {
  return String(value).trim();
};

const normalizeVoter = (body: {
  generation?: unknown;
  name?: unknown;
  phoneLast4?: unknown;
}) => {
  const generation = onlyNumbers(String(body.generation ?? "")).slice(0, 2);
  const name = cleanName(String(body.name ?? ""));
  const phoneLast4 = onlyNumbers(String(body.phoneLast4 ?? "")).slice(0, 4);

  return {
    generation,
    name,
    phoneLast4,
  };
};

const normalizePayload = (body: VoteRequestBody) => {
  const voter = normalizeVoter(body);
  const optionId = String(body.optionId ?? "");

  return {
    ...voter,
    optionId,
  };
};

const validateVoter = (payload: ReturnType<typeof normalizeVoter>) => {
  if (!/^[0-9]{2}$/.test(payload.generation)) {
    return "기수는 숫자 2자리로 입력해주세요.";
  }

  if (payload.name.length < 1) {
    return "이름을 입력해주세요.";
  }

  if (payload.name.length > 8) {
    return "이름은 8자 이내로 입력해주세요.";
  }

  if (!/^[0-9]{4}$/.test(payload.phoneLast4)) {
    return "전화번호 뒷자리는 숫자 4자리로 입력해주세요.";
  }

  return "";
};

const validatePayload = (payload: ReturnType<typeof normalizePayload>) => {
  const voterValidationMessage = validateVoter(payload);

  if (voterValidationMessage) {
    return voterValidationMessage;
  }

  if (
    !VALID_OPTION_IDS.includes(
      payload.optionId as (typeof VALID_OPTION_IDS)[number],
    )
  ) {
    return "올바르지 않은 후보입니다.";
  }

  return "";
};

const makeExistingVoteInfo = (row: ExistingVoteRow | null) => {
  if (!row) {
    return null;
  }

  const option = VOTE_OPTIONS.find((item) => item.id === row.option_id);

  return {
    optionId: row.option_id,
    optionNumber: option?.number ?? row.option_id,
    optionTitle: option?.title ?? "알 수 없는 후보",
    votedAt: row.created_at,
  };
};

const findExistingVote = async (payload: ReturnType<typeof normalizeVoter>) => {
  const { data, error } = await supabaseAdmin
    .from("votes")
    .select("option_id, created_at")
    .eq("generation", payload.generation)
    .eq("voter_name", payload.name)
    .eq("phone_last4", payload.phoneLast4)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Existing vote lookup error:", error);
    throw new Error("기존 투표 정보를 확인하지 못했습니다.");
  }

  const row = ((data ?? [])[0] ?? null) as ExistingVoteRow | null;

  return makeExistingVoteInfo(row);
};

export async function GET(request: Request) {
  const url = new URL(request.url);

  const payload = normalizeVoter({
    generation: url.searchParams.get("generation"),
    name: url.searchParams.get("name"),
    phoneLast4: url.searchParams.get("phoneLast4"),
  });

  const validationMessage = validateVoter(payload);

  if (validationMessage) {
    return NextResponse.json({ message: validationMessage }, { status: 400 });
  }

  try {
    const existingVote = await findExistingVote(payload);

    if (!existingVote) {
      return NextResponse.json({
        hasVoted: false,
        existingVote: null,
      });
    }

    return NextResponse.json({
      hasVoted: true,
      existingVote,
      message: `이미 투표가 완료된 정보입니다. 후보 ${existingVote.optionNumber}번 "${existingVote.optionTitle}"에 투표하셨습니다.`,
    });
  } catch {
    return NextResponse.json(
      { message: "기존 투표 정보를 확인하지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (getIsPollClosed()) {
    return NextResponse.json(
      {
        message: POLL_CLOSED_MESSAGE,
      },
      { status: 403 },
    );
  }

  let body: VoteRequestBody;

  try {
    body = (await request.json()) as VoteRequestBody;
  } catch {
    return NextResponse.json(
      { message: "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const payload = normalizePayload(body);
  const validationMessage = validatePayload(payload);

  if (validationMessage) {
    return NextResponse.json({ message: validationMessage }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("votes").insert({
    generation: payload.generation,
    voter_name: payload.name,
    phone_last4: payload.phoneLast4,
    option_id: payload.optionId,
  });

  if (error) {
    if (error.code === "23505") {
      try {
        const existingVote = await findExistingVote(payload);

        return NextResponse.json(
          {
            message: existingVote
              ? `이미 투표가 완료된 정보입니다. 후보 ${existingVote.optionNumber}번 "${existingVote.optionTitle}"에 투표하셨습니다.`
              : "이미 투표가 완료된 정보입니다. 투표는 1인 1표만 인정됩니다.",
            existingVote,
          },
          { status: 409 },
        );
      } catch {
        return NextResponse.json(
          {
            message:
              "이미 투표가 완료된 정보입니다. 투표는 1인 1표만 인정됩니다.",
            existingVote: null,
          },
          { status: 409 },
        );
      }
    }

    console.error("Vote insert error:", error);

    return NextResponse.json(
      {
        message:
          "투표 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { message: "투표가 저장되었습니다." },
    { status: 201 },
  );
}