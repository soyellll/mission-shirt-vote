"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type ResultOption = {
  id: string;
  number: string;
  title: string;
  description: string;
  voteCount: number;
  percent: number;
};

type DisplayOption = ResultOption & {
  displayPercent: number;
};

type ResultResponse = {
  isOpen: boolean;
  isPreview?: boolean;
  message?: string;
  totalValidVotes?: number;
  options?: ResultOption[];
  winners?: ResultOption[];
  hasTie?: boolean;
};

type Phase = "loading" | "waiting" | "counting" | "drumroll" | "revealed";

const COLORS = ["#006EE9", "#000181", "#D0FFA4"];

const sleep = (ms: number) => {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
};

const normalizePercents = (values: number[]) => {
  const sum = values.reduce((acc, value) => acc + Math.max(0, value), 0);

  if (sum <= 0) {
    return values.map(() => 0);
  }

  return values.map((value) => Math.round((Math.max(0, value) / sum) * 1000) / 10);
};

const makeFakePercents = (
  options: ResultOption[],
  frame: number,
  totalFrames: number,
) => {
  const progress = frame / totalFrames;
  const convergence = Math.min(1, Math.pow(progress, 2.3));

  const leaderIndex = Math.floor(frame / 5) % Math.max(options.length, 1);

  const fakeRaw = options.map((_, index) => {
    const wave = Math.sin(frame * 0.7 + index * 1.8) * 8;
    const boost = index === leaderIndex ? 22 : 0;
    const chase = index === (leaderIndex + 1) % options.length ? 10 : 0;

    return 30 + wave + boost + chase;
  });

  const fakePercents = normalizePercents(fakeRaw);
  const finalPercents = options.map((option) => option.percent);

  const mixed = fakePercents.map((fakePercent, index) => {
    return (
      fakePercent * (1 - convergence) + finalPercents[index] * convergence
    );
  });

  return normalizePercents(mixed);
};

const formatPercent = (value: number) => {
  return `${Math.round(value * 10) / 10}%`;
};

const getSortedDisplayOptions = (options: DisplayOption[]) => {
  return [...options].sort((a, b) => {
    if (b.displayPercent !== a.displayPercent) {
      return b.displayPercent - a.displayPercent;
    }

    return a.number.localeCompare(b.number);
  });
};

const getFinalSortedOptions = (options: ResultOption[]) => {
  return [...options].sort((a, b) => {
    if (b.voteCount !== a.voteCount) {
      return b.voteCount - a.voteCount;
    }

    return a.number.localeCompare(b.number);
  });
};

export default function RevealPage() {
  const animationStartedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ResultResponse | null>(null);
  const [displayOptions, setDisplayOptions] = useState<DisplayOption[]>([]);

  const isPreview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview") === "1";

  const finalOptions = useMemo(() => {
    return getFinalSortedOptions(result?.options ?? []);
  }, [result]);

  const winners = result?.winners ?? [];
  const hasTie = Boolean(result?.hasTie);

  const fireConfetti = async () => {
    const confettiModule = await import("canvas-confetti");
    const confetti = confettiModule.default;

    const end = Date.now() + 2600;

    const shoot = () => {
      confetti({
        particleCount: 70,
        spread: 80,
        startVelocity: 42,
        scalar: 1,
        colors: COLORS,
        origin: {
          x: Math.random() * 0.7 + 0.15,
          y: Math.random() * 0.25 + 0.05,
        },
        disableForReducedMotion: true,
      });

      if (Date.now() < end) {
        window.setTimeout(shoot, 260);
      }
    };

    shoot();
  };

  useEffect(() => {
    const loadResults = async () => {
      try {
        setPhase("loading");

        const preview = new URLSearchParams(window.location.search).get(
          "preview",
        );

        const adminPin = window.localStorage.getItem("missionVoteAdminPin");

        const response = await fetch(
          preview === "1" ? "/api/results?preview=1" : "/api/results",
          {
            method: "GET",
            cache: "no-store",
            headers:
              preview === "1" && adminPin
                ? {
                    "x-admin-pin": adminPin,
                  }
                : {},
          },
        );

        const data = (await response.json().catch(() => null)) as
          | ResultResponse
          | null;

        if (!response.ok) {
          throw new Error(
            data?.message ?? "결과 정보를 불러오지 못했습니다.",
          );
        }

        if (!data?.isOpen) {
          setMessage(
            data?.message ??
              "아직 결과 발표가 시작되지 않았습니다. 잠시만 기다려주세요.",
          );
          setResult(data);
          setPhase("waiting");
          return;
        }

        setResult(data);
        setDisplayOptions(
          (data.options ?? []).map((option) => ({
            ...option,
            displayPercent: 0,
          })),
        );
        setPhase("counting");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "결과 정보를 불러오지 못했습니다.";

        setErrorMessage(message);
        setPhase("waiting");
      }
    };

    loadResults();
  }, []);

  useEffect(() => {
    if (!result?.isOpen || !result.options || animationStartedRef.current) {
      return;
    }

    animationStartedRef.current = true;

    const runAnimation = async () => {
      const totalFrames = 62;

      for (let frame = 0; frame <= totalFrames; frame += 1) {
        const percents = makeFakePercents(result.options ?? [], frame, totalFrames);

        setDisplayOptions(
          (result.options ?? []).map((option, index) => ({
            ...option,
            displayPercent: percents[index] ?? 0,
          })),
        );

        await sleep(150);
      }

      setDisplayOptions(
        (result.options ?? []).map((option) => ({
          ...option,
          displayPercent: option.percent,
        })),
      );

      setPhase("drumroll");

      await sleep(1800);

      setPhase("revealed");

      await fireConfetti();
    };

    runAnimation();
  }, [result]);

  const visibleOptions =
    phase === "revealed"
      ? finalOptions.map((option) => ({
          ...option,
          displayPercent: option.percent,
        }))
      : getSortedDisplayOptions(displayOptions);

  if (phase === "loading") {
    return (
      <main className="min-h-screen bg-[#FDFEFF] px-5 py-5 text-[#000181]">
        <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-md flex-col justify-center">
          <p className="font-latin text-sm font-bold uppercase tracking-[0.18em] text-[#006EE9]">
            Result Reveal
          </p>

          <h1 className="mt-8 text-[54px] font-black leading-[1.18] tracking-[-0.08em]">
            결과를
            <br />
            불러오는 중
          </h1>

          <p className="mt-8 text-sm font-bold leading-8 text-[#000181]/60">
            잠시만 기다려주세요.
          </p>
        </section>
      </main>
    );
  }

  if (phase === "waiting") {
    return (
      <main className="min-h-screen bg-[#FDFEFF] px-5 py-5 text-[#000181]">
        <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-md flex-col">
          <header className="flex items-start justify-between border-b-2 border-[#000181] pb-4">
            <Link
              href="/"
              className="font-latin text-sm font-bold leading-none tracking-[-0.04em]"
            >
              ← Home
            </Link>

            <p className="font-latin text-xs font-bold uppercase tracking-[0.16em] text-[#006EE9]">
              Waiting
            </p>
          </header>

          <section className="flex flex-1 flex-col justify-center">
            <p className="font-latin text-sm font-bold uppercase tracking-[0.18em] text-[#006EE9]">
              Result
            </p>

            <h1 className="mt-8 text-[54px] font-black leading-[1.18] tracking-[-0.08em]">
              아직 결과 발표가
              <br />
              시작되지 않았습니다.
            </h1>

            <p className="mt-10 text-[16px] font-bold leading-8 text-[#000181]/70">
              {errorMessage || message}
            </p>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFEFF] px-5 py-5 text-[#000181]">
      <section className="mx-auto max-w-md">
        <header className="flex items-start justify-between border-b-2 border-[#000181] pb-4">
          <Link
            href="/"
            className="font-latin text-sm font-bold leading-none tracking-[-0.04em]"
          >
            ← Home
          </Link>

          <p className="font-latin text-xs font-bold uppercase tracking-[0.16em] text-[#006EE9]">
            {isPreview ? "Preview" : "Reveal"}
          </p>
        </header>

        <section className="pt-10">
          <p className="font-latin text-sm font-bold uppercase tracking-[0.18em] text-[#006EE9]">
            Mission T-Shirt Final
          </p>

          <h1 className="mt-8 text-[50px] font-black leading-[1.16] tracking-[-0.08em]">
            최종 단체티
            <br />
            결과 발표
          </h1>

          {isPreview && (
            <div className="mt-8 border-2 border-[#000181] bg-[#D0FFA4] px-4 py-4 text-sm font-black leading-7">
              관리자 미리보기 화면입니다. 실제 결과 공개 상태와 상관없이
              연출을 확인할 수 있습니다.
            </div>
          )}

          <div className="mt-10 border-2 border-[#000181]">
            <div className="grid grid-cols-[112px_1fr] border-b-2 border-[#000181]">
              <div className="flex min-h-16 items-center border-r-2 border-[#000181] bg-[#D0FFA4] px-4 text-sm font-black">
                Phase
              </div>
              <div className="flex min-h-16 items-center px-4 text-sm font-black">
                {phase === "counting" && "집계 중"}
                {phase === "drumroll" && "최종 결과 확인 중"}
                {phase === "revealed" && "최종 결과 공개"}
              </div>
            </div>

            <div className="grid grid-cols-[112px_1fr]">
              <div className="flex min-h-16 items-center border-r-2 border-[#000181] px-4 text-sm font-black">
                Total
              </div>
              <div className="flex min-h-16 items-center px-4 text-sm font-black">
                유효표 {result?.totalValidVotes ?? 0}표
              </div>
            </div>
          </div>

          <section className="mt-10 space-y-5">
            {visibleOptions.map((option, index) => {
              const barColor = COLORS[index % COLORS.length];
              const width =
                option.displayPercent <= 0 ? "0%" : `${option.displayPercent}%`;

              return (
                <article
                  key={option.id}
                  className="border-2 border-[#000181] bg-[#FDFEFF]"
                >
                  <div className="grid grid-cols-[1fr_82px] border-b-2 border-[#000181]">
                    <div className="px-4 py-4">
                      <p className="font-latin text-xs font-bold uppercase tracking-[0.18em] text-[#006EE9]">
                        Candidate {option.number}
                      </p>

                      <h2 className="mt-3 text-[30px] font-black leading-[1.15] tracking-[-0.07em]">
                        {option.title}
                      </h2>
                    </div>

                    <div className="grid place-items-center border-l-2 border-[#000181] bg-[#006EE9]">
                      <p className="font-latin text-[34px] font-bold leading-none tracking-[-0.08em] text-[#FDFEFF]">
                        {formatPercent(option.displayPercent)}
                      </p>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="h-8 border-2 border-[#000181] bg-[#FDFEFF]">
                      <div
                        className="h-full transition-all duration-150"
                        style={{
                          width,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>

                    {phase === "revealed" && (
                      <div className="mt-4 flex items-center justify-between gap-4">
                        <p className="text-sm font-black leading-7 text-[#000181]/65">
                          최종 득표수
                        </p>

                        <p className="font-latin text-2xl font-bold tracking-[-0.06em]">
                          {option.voteCount}표
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </section>

          {phase === "drumroll" && (
            <section className="mt-12 border-y-2 border-[#000181] py-8 text-center">
              <p className="font-latin text-sm font-bold uppercase tracking-[0.18em] text-[#006EE9]">
                Final Pick
              </p>
              <p className="mt-6 text-[42px] font-black leading-[1.2] tracking-[-0.08em]">
                최종 선택된
                <br />
                단체티는?
              </p>
            </section>
          )}

          {phase === "revealed" && (
            <section className="mt-12">
              {winners.length === 0 ? (
                <div className="border-2 border-[#000181] px-4 py-6">
                  <p className="text-lg font-black leading-8">
                    아직 유효표가 없습니다.
                  </p>
                </div>
              ) : (
                <div className="border-2 border-[#000181] bg-[#D0FFA4]">
                  <div className="border-b-2 border-[#000181] px-4 py-4">
                    <p className="font-latin text-sm font-bold uppercase tracking-[0.18em] text-[#006EE9]">
                      Winner
                    </p>
                  </div>

                  <div className="px-4 py-8 text-center">
                    <p className="text-[22px] font-black leading-8">
                      {hasTie ? "공동 1위" : "최종 선택"}
                    </p>

                    <h2 className="mt-5 text-[44px] font-black leading-[1.15] tracking-[-0.08em]">
                      {winners
                        .map(
                          (winner) =>
                            `후보 ${winner.number}번 ${winner.title}`,
                        )
                        .join(" / ")}
                    </h2>

                    {hasTie && (
                      <p className="mt-8 text-sm font-black leading-8 text-[#000181]/70">
                        동점 발생 시 공동 1위로 표시하고,
                        <br />
                        최종 진행 디자인은 담당자 확인 후 공지합니다.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <section className="mt-10 border-y-2 border-[#000181]">
                {finalOptions.map((option, index) => (
                  <div
                    key={option.id}
                    className="grid grid-cols-[60px_1fr_72px] border-b-2 border-[#000181] last:border-b-0"
                  >
                    <div className="flex min-h-16 items-center justify-center border-r-2 border-[#000181] font-latin text-sm font-bold">
                      {index + 1}
                    </div>

                    <div className="flex min-h-16 flex-col justify-center px-4">
                      <p className="text-sm font-black">
                        후보 {option.number} / {option.title}
                      </p>
                      <p className="mt-1 text-xs font-bold text-[#000181]/45">
                        {formatPercent(option.percent)}
                      </p>
                    </div>

                    <div className="flex min-h-16 items-center justify-center border-l-2 border-[#000181] font-latin text-lg font-bold">
                      {option.voteCount}
                    </div>
                  </div>
                ))}
              </section>
            </section>
          )}
        </section>
      </section>
    </main>
  );
}