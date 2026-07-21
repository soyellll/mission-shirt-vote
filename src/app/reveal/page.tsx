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

type ImageOption = ResultOption & {
  imageSrc: string;
};

type DisplayOption = ImageOption & {
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

type RankedOption = ImageOption & {
  rank: number;
};

const DEPLOY_MARK = "v3-final-debut";

const COLORS = ["#006EE9", "#000181", "#D0FFA4"];

const sleep = (ms: number) => {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
};

const getImageSrc = (id: string) => {
  return "/" + id + ".jpg";
};

const withImageSources = (options: ResultOption[]): ImageOption[] => {
  return options.map((option) => ({
    ...option,
    imageSrc: getImageSrc(option.id),
  }));
};

const normalizePercents = (values: number[]) => {
  const sum = values.reduce((acc, value) => acc + Math.max(0, value), 0);

  if (sum <= 0) {
    return values.map(() => 0);
  }

  return values.map(
    (value) => Math.round((Math.max(0, value) / sum) * 1000) / 10,
  );
};

const makeFakePercents = (
  options: ResultOption[],
  frame: number,
  totalFrames: number,
) => {
  const progress = frame / totalFrames;
  const convergence = Math.min(1, Math.pow(progress, 2.35));
  const leaderIndex = Math.floor(frame / 5) % Math.max(options.length, 1);

  const fakeRaw = options.map((_, index) => {
    const wave = Math.sin(frame * 0.68 + index * 1.95) * 9;
    const boost = index === leaderIndex ? 24 : 0;
    const chase = index === (leaderIndex + 1) % options.length ? 12 : 0;
    const drop = index === (leaderIndex + 2) % options.length ? -4 : 0;

    return 30 + wave + boost + chase + drop;
  });

  const fakePercents = normalizePercents(fakeRaw);
  const finalPercents = options.map((option) => option.percent);

  const mixed = fakePercents.map((fakePercent, index) => {
    return fakePercent * (1 - convergence) + finalPercents[index] * convergence;
  });

  return normalizePercents(mixed);
};

const formatPercent = (value: number) => {
  const rounded = Math.round(value * 10) / 10;

  if (Number.isInteger(rounded)) {
    return rounded + "%";
  }

  return rounded.toFixed(1) + "%";
};

const getSortedDisplayOptions = (options: DisplayOption[]) => {
  return [...options].sort((a, b) => {
    if (b.displayPercent !== a.displayPercent) {
      return b.displayPercent - a.displayPercent;
    }

    return a.title.localeCompare(b.title, "ko");
  });
};

const getFinalSortedOptions = (options: ImageOption[]) => {
  return [...options].sort((a, b) => {
    if (b.voteCount !== a.voteCount) {
      return b.voteCount - a.voteCount;
    }

    return a.title.localeCompare(b.title, "ko");
  });
};

const makeRankedOptions = (options: ImageOption[]): RankedOption[] => {
  const sorted = getFinalSortedOptions(options);

  let previousVoteCount: number | null = null;
  let currentRank = 0;

  return sorted.map((option, index) => {
    if (previousVoteCount === null || option.voteCount !== previousVoteCount) {
      currentRank = index + 1;
    }

    previousVoteCount = option.voteCount;

    return {
      ...option,
      rank: currentRank,
    };
  });
};

function HeaderMark({
  mode,
}: {
  mode: string;
}) {
  return (
    <header className="flex items-start justify-between border-b-2 border-[#000181] pb-4">
      <Link
        href="/"
        className="font-latin text-sm font-bold leading-none tracking-[-0.04em]"
      >
        ← Home
      </Link>

      <div className="text-right">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.16em] text-[#006EE9]">
          {mode}
        </p>
        <p className="font-latin mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#000181]/40">
          {DEPLOY_MARK}
        </p>
      </div>
    </header>
  );
}

function CandidateImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="flex h-full min-h-44 items-center justify-center border-2 border-[#000181] bg-[#FDFEFF] px-4 py-8 text-center">
        <p className="text-sm font-black leading-7 text-[#000181]/60">
          이미지 준비중
          <br />
          {src.replace("/", "")}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-44 border-2 border-[#000181] bg-[#FDFEFF]">
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className="h-full w-full object-contain"
      />
    </div>
  );
}

export default function RevealPage() {
  const animationStartedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ResultResponse | null>(null);
  const [displayOptions, setDisplayOptions] = useState<DisplayOption[]>([]);
  const [isPreview, setIsPreview] = useState(false);

  const imageOptions = useMemo(() => {
    return withImageSources(result?.options ?? []);
  }, [result]);

  const rankedOptions = useMemo(() => {
    return makeRankedOptions(imageOptions);
  }, [imageOptions]);

  const winnerOptions = useMemo(() => {
    const winnerIds = new Set((result?.winners ?? []).map((winner) => winner.id));

    return imageOptions.filter((option) => winnerIds.has(option.id));
  }, [imageOptions, result]);

  const hasTie = Boolean(result?.hasTie);
  const totalValidVotes = result?.totalValidVotes ?? 0;

  const fireConfetti = async () => {
    try {
      const confettiModule = await import("canvas-confetti");
      const confetti = confettiModule.default;
      const end = Date.now() + 3000;

      const shoot = () => {
        confetti({
          particleCount: 85,
          spread: 90,
          startVelocity: 42,
          scalar: 1,
          colors: COLORS,
          origin: {
            x: Math.random() * 0.7 + 0.15,
            y: Math.random() * 0.28 + 0.02,
          },
          disableForReducedMotion: true,
        });

        if (Date.now() < end) {
          window.setTimeout(shoot, 250);
        }
      };

      shoot();
    } catch {
      // 폭죽 로딩에 실패해도 결과 화면은 그대로 유지한다.
    }
  };

  useEffect(() => {
    const loadResults = async () => {
      try {
        setPhase("loading");

        const searchParams = new URLSearchParams(window.location.search);
        const preview = searchParams.get("preview") === "1";
        const adminPin =
          window.localStorage.getItem("missionVoteAdminPin") ??
          window.sessionStorage.getItem("missionVoteAdminPin");

        setIsPreview(preview);

        const response = await fetch(
          preview ? "/api/results?preview=1" : "/api/results",
          {
            method: "GET",
            cache: "no-store",
            headers:
              preview && adminPin
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
          withImageSources(data.options ?? []).map((option) => ({
            ...option,
            displayPercent: 0,
          })),
        );
        setPhase("counting");
      } catch (error) {
        const nextMessage =
          error instanceof Error
            ? error.message
            : "결과 정보를 불러오지 못했습니다.";

        setErrorMessage(nextMessage);
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
      const totalFrames = 64;

      for (let frame = 0; frame <= totalFrames; frame += 1) {
        const percents = makeFakePercents(
          result.options ?? [],
          frame,
          totalFrames,
        );

        setDisplayOptions(
          withImageSources(result.options ?? []).map((option, index) => ({
            ...option,
            displayPercent: percents[index] ?? 0,
          })),
        );

        await sleep(145);
      }

      setDisplayOptions(
        withImageSources(result.options ?? []).map((option) => ({
          ...option,
          displayPercent: option.percent,
        })),
      );

      setPhase("drumroll");

      await sleep(1400);

      setPhase("revealed");

      await fireConfetti();
    };

    runAnimation();
  }, [result]);

  const visibleOptions =
    phase === "revealed"
      ? rankedOptions.map((option) => ({
          ...option,
          displayPercent: option.percent,
        }))
      : getSortedDisplayOptions(displayOptions);

  if (phase === "loading") {
    return (
      <main className="min-h-screen bg-[#FDFEFF] px-5 py-5 text-[#000181]">
        <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-md flex-col">
          <HeaderMark mode="Loading" />

          <section className="flex flex-1 flex-col justify-center">
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
        </section>
      </main>
    );
  }

  if (phase === "waiting") {
    return (
      <main className="min-h-screen bg-[#FDFEFF] px-5 py-5 text-[#000181]">
        <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-md flex-col">
          <HeaderMark mode="Waiting" />

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
        <HeaderMark mode={isPreview ? "Preview" : "Reveal"} />

        <section className="pt-8">
          {phase !== "revealed" && (
            <>
              <p className="font-latin text-sm font-bold uppercase tracking-[0.18em] text-[#006EE9]">
                Mission T-Shirt Final
              </p>

              <h1 className="mt-7 text-[48px] font-black leading-[1.16] tracking-[-0.08em]">
                최종 데뷔를
                <br />
                향한 집계 중
              </h1>

              {isPreview && (
                <div className="mt-7 border-2 border-[#000181] bg-[#D0FFA4] px-4 py-4 text-sm font-black leading-7">
                  관리자 미리보기 화면입니다. 실제 결과 공개 상태와 상관없이
                  연출을 확인할 수 있습니다.
                </div>
              )}

              <div className="mt-8 border-2 border-[#000181]">
                <div className="grid grid-cols-[104px_1fr] border-b-2 border-[#000181]">
                  <div className="flex min-h-14 items-center border-r-2 border-[#000181] bg-[#D0FFA4] px-4 text-sm font-black">
                    Phase
                  </div>
                  <div className="flex min-h-14 items-center px-4 text-sm font-black">
                    {phase === "counting" && "엎치락뒤치락 집계 중"}
                    {phase === "drumroll" && "최종 데뷔 발표 직전"}
                  </div>
                </div>

                <div className="grid grid-cols-[104px_1fr]">
                  <div className="flex min-h-14 items-center border-r-2 border-[#000181] px-4 text-sm font-black">
                    Total
                  </div>
                  <div className="flex min-h-14 items-center px-4 text-sm font-black">
                    유효표 {totalValidVotes}표
                  </div>
                </div>
              </div>
            </>
          )}

          {phase === "revealed" && (
            <section>
              <p className="font-latin text-sm font-bold uppercase tracking-[0.18em] text-[#006EE9]">
                Final Debut
              </p>

              <h1 className="mt-7 text-[54px] font-black leading-[1.08] tracking-[-0.09em]">
                최종
                <br />
                데뷔
              </h1>

              {winnerOptions.length === 0 ? (
                <div className="mt-8 border-2 border-[#000181] px-4 py-8">
                  <p className="text-lg font-black leading-8">
                    아직 유효표가 없습니다.
                  </p>
                </div>
              ) : (
                <div className="mt-8 space-y-5">
                  {winnerOptions.map((winner) => (
                    <article
                      key={winner.id}
                      className="border-2 border-[#000181] bg-[#D0FFA4]"
                    >
                      <div className="border-b-2 border-[#000181] px-4 py-4">
                        <p className="font-latin text-xs font-bold uppercase tracking-[0.18em] text-[#006EE9]">
                          {hasTie ? "Co-Debut Winner" : "Debut Winner"}
                        </p>

                        <h2 className="mt-3 text-[42px] font-black leading-[1.08] tracking-[-0.08em]">
                          {winner.title}
                        </h2>
                      </div>

                      <div className="p-4">
                        <div className="h-64">
                          <CandidateImage
                            src={winner.imageSrc}
                            alt={winner.title}
                          />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {hasTie && winnerOptions.length > 0 && (
                <div className="mt-6 border-2 border-[#000181] bg-[#FDFEFF] px-4 py-4 text-sm font-black leading-8">
                  동점 발생 시 공동 1위로 표시하고,
                  <br />
                  최종 진행 디자인은 담당자 확인 후 공지합니다.
                </div>
              )}
            </section>
          )}

          {phase !== "revealed" && (
            <section className="mt-9 space-y-5">
              {visibleOptions.map((option, index) => {
                const barColor = COLORS[index % COLORS.length];
                const width =
                  option.displayPercent <= 0
                    ? "0%"
                    : option.displayPercent + "%";

                return (
                  <article
                    key={option.id}
                    className="border-2 border-[#000181] bg-[#FDFEFF]"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_118px] border-b-2 border-[#000181]">
                      <div className="px-4 py-4">
                        <p className="font-latin text-xs font-bold uppercase tracking-[0.18em] text-[#006EE9]">
                          Live Rank
                        </p>

                        <h2 className="mt-3 text-[30px] font-black leading-[1.15] tracking-[-0.07em]">
                          {option.title}
                        </h2>
                      </div>

                      <div className="grid place-items-center border-l-2 border-[#000181] bg-[#006EE9] px-2">
                        <p className="font-latin whitespace-nowrap text-center text-[28px] font-bold leading-none tracking-[-0.08em] text-[#FDFEFF]">
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
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          {phase === "drumroll" && (
            <section className="mt-10 border-y-2 border-[#000181] py-8 text-center">
              <p className="font-latin text-sm font-bold uppercase tracking-[0.18em] text-[#006EE9]">
                Final Debut
              </p>
              <p className="mt-6 text-[42px] font-black leading-[1.2] tracking-[-0.08em]">
                최종 데뷔할
                <br />
                티셔츠는?
              </p>
            </section>
          )}

          {phase === "revealed" && (
            <section className="mt-8">
              <div className="border-y-2 border-[#000181]">
                {rankedOptions.map((option) => (
                  <div
                    key={option.id}
                    className="grid grid-cols-[58px_minmax(0,1fr)_86px] border-b-2 border-[#000181] last:border-b-0"
                  >
                    <div className="flex min-h-16 items-center justify-center border-r-2 border-[#000181] font-latin text-sm font-bold">
                      {option.rank}위
                    </div>

                    <div className="flex min-h-16 flex-col justify-center px-3">
                      <p className="text-sm font-black leading-5">
                        {option.title}
                      </p>
                      <p className="mt-1 text-xs font-bold text-[#000181]/45">
                        {option.voteCount}표
                      </p>
                    </div>

                    <div className="flex min-h-16 items-center justify-center border-l-2 border-[#000181] px-2 font-latin text-lg font-bold">
                      {formatPercent(option.percent)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </section>
      </section>
    </main>
  );
}
