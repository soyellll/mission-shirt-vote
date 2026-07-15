"use client";

import { useEffect, useState } from "react";
import { POLL_CLOSE_AT, POLL_CLOSE_AT_LABEL } from "../lib/pollConfig";

type RemainingTime = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isClosed: boolean;
};

const getRemainingTime = (): RemainingTime => {
  const targetTime = new Date(POLL_CLOSE_AT).getTime();
  const nowTime = new Date().getTime();
  const diff = Math.max(0, targetTime - nowTime);

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 60 / 60 / 24);
  const hours = Math.floor((totalSeconds / 60 / 60) % 24);
  const minutes = Math.floor((totalSeconds / 60) % 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    isClosed: diff <= 0,
  };
};

const formatNumber = (value: number) => {
  return String(value).padStart(2, "0");
};

export default function Countdown() {
  const [remainingTime, setRemainingTime] = useState<RemainingTime | null>(
    null,
  );

  useEffect(() => {
    const updateRemainingTime = () => {
      setRemainingTime(getRemainingTime());
    };

    updateRemainingTime();

    const timerId = window.setInterval(updateRemainingTime, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  if (!remainingTime) {
    return (
      <section className="border-2 border-[#000181] px-4 py-5">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.18em] text-[#006EE9]">
          Vote Timer
        </p>
        <p className="mt-3 text-sm font-bold text-[#000181]/60">
          투표 시간을 확인하는 중입니다.
        </p>
      </section>
    );
  }

  if (remainingTime.isClosed) {
    return (
      <section className="border-2 border-[#000181] bg-[#D0FFA4] px-4 py-5">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.18em] text-[#006EE9]">
          Vote Closed
        </p>
        <p className="mt-4 text-2xl font-black leading-[1.35] tracking-[-0.06em] text-[#000181]">
          투표가 종료되었습니다.
        </p>
        <p className="mt-3 text-sm font-bold leading-7 tracking-[-0.035em] text-[#000181]/70">
          결과를 집계 중이니 선교사님들 잠시만 기다려주세요.
        </p>
      </section>
    );
  }

  return (
    <section className="border-2 border-[#000181] px-4 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-latin text-xs font-bold uppercase tracking-[0.18em] text-[#006EE9]">
            Vote Countdown
          </p>
          <p className="mt-3 text-sm font-bold leading-6 tracking-[-0.035em] text-[#000181]/60">
            투표 종료
            <br />
            {POLL_CLOSE_AT_LABEL}
          </p>
        </div>

        <div className="text-right">
          <p className="font-latin text-[42px] font-bold leading-none tracking-[-0.08em] text-[#000181]">
            {remainingTime.days}
          </p>
          <p className="font-latin mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#006EE9]">
            Days
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 border-t-2 border-[#000181] pt-4">
        <div>
          <p className="font-latin text-2xl font-bold leading-none tracking-[-0.06em]">
            {formatNumber(remainingTime.hours)}
          </p>
          <p className="font-latin mt-2 text-xs font-bold uppercase text-[#000181]/45">
            Hours
          </p>
        </div>

        <div>
          <p className="font-latin text-2xl font-bold leading-none tracking-[-0.06em]">
            {formatNumber(remainingTime.minutes)}
          </p>
          <p className="font-latin mt-2 text-xs font-bold uppercase text-[#000181]/45">
            Min
          </p>
        </div>

        <div>
          <p className="font-latin text-2xl font-bold leading-none tracking-[-0.06em]">
            {formatNumber(remainingTime.seconds)}
          </p>
          <p className="font-latin mt-2 text-xs font-bold uppercase text-[#000181]/45">
            Sec
          </p>
        </div>
      </div>
    </section>
  );
}