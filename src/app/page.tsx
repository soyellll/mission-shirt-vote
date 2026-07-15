"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState } from "react";
import Countdown from "../components/Countdown";

const notices = [
  "1인 1표만 인정됩니다",
  "중복 투표는 관리자 확인 후 무효표 처리될 수 있습니다",
  "결과는 투표 종료 후 공개됩니다",
];

function AnimatedLogo() {
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="logo-spin-settle mx-auto w-[78vw] max-w-[340px]">
      {logoError ? (
        <div className="text-center">
          <p className="font-latin text-[72px] font-bold leading-[0.86] tracking-[-0.08em] text-[#000181]">
            MISSION
            <br />
            VOTE
          </p>
        </div>
      ) : (
        <img
          src="/logo.png"
          alt="단기선교 단체티 투표 로고"
          onError={() => setLogoError(true)}
          className="block w-full object-contain"
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FDFEFF] text-[#000181]">
      <section className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-5">
        <header className="flex items-start justify-between border-b-2 border-[#000181] pb-4">
          <div>
            <p className="font-latin text-sm font-bold leading-none tracking-[-0.04em]">
              Summer Mission
            </p>
            <p className="font-latin mt-1 text-sm font-bold leading-none tracking-[-0.04em] text-[#006EE9]">
              T-Shirt Vote
            </p>
          </div>

          <p className="font-latin text-right text-xs font-bold leading-[1.45] tracking-[-0.03em] text-[#000181]/55">
            온세계교회
            <br />
            <Link
              href="/admin"
              aria-label="관리자 페이지로 이동"
              className="text-[#000181]/55 no-underline"
            >
              1
            </Link>
            청년함대
          </p>
        </header>

        <section className="pt-14">
          <AnimatedLogo />
        </section>

        <section className="pt-14">
          <p className="font-latin text-sm font-bold uppercase tracking-[0.18em] text-[#006EE9]">
            함대 프로듀서님들!
          </p>

          <h1 className="mt-7 text-[56px] font-black leading-[1.16] tracking-[-0.075em] text-[#000181]">
            당신의
            <br />
            티셔츠에게
            <br />
            지금 투표하세요!
          </h1>

          <p className="mt-8 text-[15px] font-bold leading-8 tracking-[-0.035em] text-[#000181]/70">
            가는 선교사와 보내는 선교사가 함께 고르는
            <br />
            우리의 단기선교 단체티
          </p>
        </section>

        <section className="mt-12">
          <Countdown />
        </section>

        <section className="mt-8 border-y-2 border-[#000181]">
          {notices.map((notice, index) => (
            <div
              key={notice}
              className="grid grid-cols-[40px_1fr] border-b-2 border-[#000181] last:border-b-0"
            >
              <div
                className={[
                  "grid min-h-14 place-items-center border-r-2 border-[#000181] font-latin text-sm font-bold",
                  index === 0 ? "bg-[#D0FFA4]" : "bg-[#FDFEFF]",
                ].join(" ")}
              >
                0{index + 1}
              </div>

              <div className="flex min-h-14 items-center px-4 text-sm font-bold leading-6 tracking-[-0.035em]">
                {notice}
              </div>
            </div>
          ))}
        </section>

        <div className="mt-auto pt-8">
          <Link
            href="/vote"
            className="block border-2 border-[#000181] bg-[#006EE9] px-5 py-5 text-center text-lg font-black tracking-[-0.04em] text-[#FDFEFF] transition hover:bg-[#000181] active:translate-x-1 active:translate-y-1"
          >
            투표 시작하기
          </Link>

          <p className="font-latin mt-5 text-center text-xs font-bold leading-5 tracking-[-0.02em] text-[#000181]/45">
            Results will be opened after voting closes.
          </p>
        </div>
      </section>
    </main>
  );
}