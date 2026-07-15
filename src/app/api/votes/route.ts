import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import {
  getIsPollClosed,
  POLL_CLOSED_MESSAGE,
  VALID_OPTION_IDS,
} from "../../../lib/pollConfig";

type VoteRequestBody = {
  generation?: unknown;
  name?: unknown;
  phoneLast4?: unknown;
  optionId?: unknown;
};

const onlyNumbers = (value: string) => {
  return value.replace(/[^0-9]/g, "");
};

const onlyLetters = (value: string) => {
  return value.replace(/[^가-힣a-zA-Z]/g, "");
};

const cleanName = (value: string) => {
  return onlyLetters(value).slice(0, 20);
};

const normalizePayload = (body: VoteRequestBody) => {
  const generation = onlyNumbers(String(body.generation ?? "")).slice(0, 2);
  const name = cleanName(String(body.name ?? ""));
  const phoneLast4 = onlyNumbers(String(body.phoneLast4 ?? "")).slice(0, 4);
  const optionId = String(body.optionId ?? "");

  return {
    generation,
    name,
    phoneLast4,
    optionId,
  };
};

const validatePayload = (payload: ReturnType<typeof normalizePayload>) => {
  if (!/^[0-9]{2}$/.test(payload.generation)) {
    return "기수는 숫자 2자리로 입력해주세요.";
  }

  if (!/^[가-힣a-zA-Z]{2,20}$/.test(payload.name)) {
    return "이름은 한글 또는 영문 2글자 이상으로 입력해주세요.";
  }

  if (!/^[0-9]{4}$/.test(payload.phoneLast4)) {
    return "전화번호 뒷자리는 숫자 4자리로 입력해주세요.";
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
    return NextResponse.json(
      { message: validationMessage },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin.from("votes").insert({
    generation: payload.generation,
    voter_name: payload.name,
    phone_last4: payload.phoneLast4,
    option_id: payload.optionId,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        {
          message:
            "이미 투표가 완료된 정보입니다. 투표는 1인 1표만 인정됩니다.",
        },
        { status: 409 },
      );
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