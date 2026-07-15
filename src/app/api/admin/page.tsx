"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type AdminOption = {
  id: string;
  number: string;
  title: string;
  description: string;
  voteCount: number;
  percent: number;
};

type AdminSummary = {
  pollClosesAtLabel: string;
  isPollClosed: boolean;
  totalSubmittedVotes: number;
  totalValidVotes: number;
  totalInvalidVotes: number;
  options: AdminOption[];
  lastUpdatedAt: string;
};

const formatTime = (isoDate: string) => {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(isoDate));
};

export default function AdminPage() {
  const [pinInput, setPinInput] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedPin = window.sessionStorage.getItem("missionVoteAdminPin");

    if (savedPin) {
      setPinInput(savedPin);
      setAdminPin(savedPin);
      setIsUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (!isUnlocked || !adminPin) {
      return;
    }

    let ignore = false;

    const loadSummary = async () => {
      try {
        setIsLoading(true);

        const response = await fetch("/api/admin/summary", {
          method: "GET",
          headers: {
            "x-admin-pin": adminPin,
          },
          cache: "no-store",
        });

        const result = (await response.json().catch(() => null)) as
          | (AdminSummary & { message?: string })
          | null;

        if (!response.ok) {
          throw new Error(
            result?.message ?? "관리자 데이터를 불러오지 못했습니다.",
          );
        }

        if (!ignore) {
          setSummary(result);
          setErrorMessage("");
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "관리자 데이터를 불러오지 못했습니다.";

        if (!ignore) {
          setErrorMessage(message);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    loadSummary();

    const timerId = window.setInterval(loadSummary, 3000);

    return () => {
      ignore = true;
      window.clearInterval(timerId);
    };
  }, [adminPin, isUnlocked]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextPin = pinInput.trim();

    if (!nextPin) {
      setErrorMessage("관리자 PIN을 입력해주세요.");
      return;
    }

    window.sessionStorage.setItem("missionVoteAdminPin", nextPin);
    setAdminPin(nextPin);
    setIsUnlocked(true);
    setErrorMessage("");
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem("missionVoteAdminPin");
    setPinInput("");
    setAdminPin("");
    setIsUnlocked(false);
    setSummary(null);
    setErrorMessage("");
  };

  if (!isUnlocked) {
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
              Admin
            </p>
          </header>

          <section className="pt-12">
            <p className="font-latin text-sm font-bold uppercase tracking-[0.18em] text-[#006EE9]">
              Admin Check
            </p>

            <h1 className="mt-8 text-[52px] font-black leading-[1.16] tracking-[-0.08em] text-[#000181]">
              관리자
              <br />
              페이지
            </h1>

            <p className="mt-8 text-sm font-bold leading-8 tracking-[-0.035em] text-[#000181]/65">
              투표 현황을 확인하려면 관리자 PIN을 입력해주세요.
            </p>

            <form onSubmit={handleSubmit} className="mt-10">
              <div className="border-2 border-[#000181]">
                <label className="block border-b-2 border-[#000181] bg-[#D0FFA4] px-4 py-4 text-sm font-black tracking-[-0.04em]">
                  관리자 PIN
                </label>

                <input
                  type="password"
                  value={pinInput}
                  onChange={(event) => setPinInput(event.target.value)}
                  placeholder="PIN 입력"
                  className="min-h-20 w-full bg-[#FDFEFF] px-4 text-2xl font-black tracking-[-0.04em] text-[#000181] outline-none placeholder:text-[#000181]/25"
                />
              </div>

              {errorMessage && (
                <div className="mt-5 border-2 border-[#000181] bg-[#D0FFA4] px-4 py-4 text-sm font-black leading-7 tracking-[-0.035em] text-[#000181]">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                className="mt-8 block w-full border-2 border-[#000181] bg-[#006EE9] px-5 py-5 text-center text-lg font-black tracking-[-0.04em] text-[#FDFEFF] transition hover:bg-[#000181] active:translate-x-1 active:translate-y-1"
              >
                관리자 입장
              </button>
            </form>
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

          <button
            type="button"
            onClick={handleLogout}
            className="font-latin text-xs font-bold uppercase tracking-[0.16em] text-[#006EE9]"
          >
            Logout
          </button>
        </header>

        <section className="pt-10">
          <p className="font-latin text-sm font-bold uppercase tracking-[0.18em] text-[#006EE9]">
            Live Vote
          </p>

          <h1 className="mt-8 text-[50px] font-black leading-[1.16] tracking-[-0.08em] text-[#000181]">
            관리자
            <br />
            실시간 집계
          </h1>

          {errorMessage && (
            <div className="mt-6 border-2 border-[#000181] bg-[#D0FFA4] px-4 py-4 text-sm font-black leading-7 tracking-[-0.035em] text-[#000181]">
              {errorMessage}
            </div>
          )}

          {!summary && !errorMessage && (
            <div className="mt-10 border-2 border-[#000181] px-4 py-8 text-sm font-black leading-7 tracking-[-0.035em] text-[#000181]/60">
              집계 데이터를 불러오는 중입니다.
            </div>
          )}

          {summary && (
            <>
              <section className="mt-10 grid grid-cols-2 border-2 border-[#000181]">
                <div className="border-r-2 border-[#000181] p-4">
                  <p className="font-latin text-xs font-bold uppercase tracking-[0.16em] text-[#006EE9]">
                    Valid
                  </p>
                  <p className="font-latin mt-4 text-[48px] font-bold leading-none tracking-[-0.08em]">
                    {summary.totalValidVotes}
                  </p>
                  <p className="mt-2 text-xs font-bold text-[#000181]/45">
                    유효표
                  </p>
                </div>

                <div className="p-4">
                  <p className="font-latin text-xs font-bold uppercase tracking-[0.16em] text-[#006EE9]">
                    Total
                  </p>
                  <p className="font-latin mt-4 text-[48px] font-bold leading-none tracking-[-0.08em]">
                    {summary.totalSubmittedVotes}
                  </p>
                  <p className="mt-2 text-xs font-bold text-[#000181]/45">
                    전체 제출
                  </p>
                </div>
              </section>

              <section className="mt-5 border-2 border-[#000181]">
                <div className="grid grid-cols-[112px_1fr] border-b-2 border-[#000181]">
                  <div className="flex min-h-16 items-center border-r-2 border-[#000181] bg-[#D0FFA4] px-4 text-sm font-black">
                    상태
                  </div>
                  <div className="flex min-h-16 items-center px-4 text-sm font-black leading-7 tracking-[-0.035em]">
                    {summary.isPollClosed ? "투표 종료" : "투표 진행 중"}
                  </div>
                </div>

                <div className="grid grid-cols-[112px_1fr] border-b-2 border-[#000181]">
                  <div className="flex min-h-16 items-center border-r-2 border-[#000181] px-4 text-sm font-black">
                    종료 시간
                  </div>
                  <div className="flex min-h-16 items-center px-4 text-sm font-black leading-7 tracking-[-0.035em]">
                    {summary.pollClosesAtLabel}
                  </div>
                </div>

                <div className="grid grid-cols-[112px_1fr]">
                  <div className="flex min-h-16 items-center border-r-2 border-[#000181] px-4 text-sm font-black">
                    마지막 갱신
                  </div>
                  <div className="flex min-h-16 items-center px-4 text-sm font-black leading-7 tracking-[-0.035em]">
                    {formatTime(summary.lastUpdatedAt)}
                    {isLoading ? " 갱신 중..." : ""}
                  </div>
                </div>
              </section>

              <section className="mt-10 space-y-8">
                {summary.options.map((option, index) => (
                  <article key={option.id} className="border-2 border-[#000181]">
                    <div className="grid grid-cols-[1fr_92px] border-b-2 border-[#000181]">
                      <div className="px-4 py-5">
                        <p className="font-latin text-xs font-bold uppercase tracking-[0.18em] text-[#006EE9]">
                          Candidate {option.number}
                        </p>

                        <h2 className="mt-4 text-[34px] font-black leading-[1.15] tracking-[-0.07em] text-[#000181]">
                          {option.title}
                        </h2>
                      </div>

                      <div className="grid place-items-center border-l-2 border-[#000181] bg-[#006EE9]">
                        <p className="font-latin text-[42px] font-bold leading-none tracking-[-0.08em] text-[#FDFEFF]">
                          {option.voteCount}
                        </p>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="h-6 border-2 border-[#000181]">
                        <div
                          className={[
                            "h-full bg-[#006EE9]",
                            index === 0 ? "bg-[#006EE9]" : "",
                            index === 1 ? "bg-[#000181]" : "",
                            index === 2 ? "bg-[#D0FFA4]" : "",
                          ].join(" ")}
                          style={{
                            width:
                              option.voteCount === 0
                                ? "0%"
                                : `${Math.max(option.percent, 4)}%`,
                          }}
                        />
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-sm font-black leading-7 tracking-[-0.035em] text-[#000181]/65">
                          {option.description}
                        </p>

                        <p className="font-latin shrink-0 text-2xl font-bold tracking-[-0.06em] text-[#000181]">
                          {option.percent}%
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </section>

              {summary.totalInvalidVotes > 0 && (
                <section className="mt-8 border-2 border-[#000181] bg-[#D0FFA4] px-4 py-4">
                  <p className="text-sm font-black leading-7 tracking-[-0.035em]">
                    무효표 처리된 투표가 {summary.totalInvalidVotes}개 있습니다.
                    위 집계에서는 무효표가 제외됩니다.
                  </p>
                </section>
              )}
            </>
          )}
        </section>
      </section>
    </main>
  );
}