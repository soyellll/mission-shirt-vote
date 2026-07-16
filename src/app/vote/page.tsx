"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Countdown from "../../components/Countdown";
import {
  getIsPollClosed,
  POLL_CLOSED_MESSAGE,
  VOTE_OPTIONS,
} from "../../lib/pollConfig";

type Step = "info" | "select" | "done";

type VoterInfo = {
  generation: string;
  name: string;
  phoneLast4: string;
};

type ShirtOption = {
  id: string;
  number: string;
  title: string;
  description: string;
  imageSrc: string;
};

const SHIRT_OPTIONS: ShirtOption[] = VOTE_OPTIONS.map((option) => ({
  ...option,
  imageSrc: `/${option.id}.jpg`,
}));

const onlyNumbers = (value: string) => {
  return value.replace(/[^0-9]/g, "");
};

const cleanName = (value: string) => {
  return value.trim().slice(0, 30);
};

const normalizeForm = (form: VoterInfo): VoterInfo => {
  return {
    generation: onlyNumbers(form.generation).slice(0, 2),
    name: cleanName(form.name),
    phoneLast4: onlyNumbers(form.phoneLast4).slice(0, 4),
  };
};

function CandidateImage({
  src,
  alt,
  number,
}: {
  src: string;
  alt: string;
  number: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="grid h-72 border-2 border-[#000181] bg-[#FDFEFF] p-5">
        <div className="flex flex-col justify-between">
          <p className="font-latin text-[72px] font-bold leading-none tracking-[-0.08em] text-[#006EE9]">
            {number}
          </p>

          <div>
            <p className="text-sm font-black tracking-[-0.04em] text-[#000181]">
              이미지 준비중
            </p>
            <p className="mt-3 text-xs font-bold leading-6 tracking-[-0.03em] text-[#000181]/50">
              public 폴더에 {src.replace("/", "")} 파일을 넣으면 표시됩니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-72 border-2 border-[#000181] bg-[#FDFEFF]">
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className="h-full w-full object-contain"
      />
    </div>
  );
}

export default function VotePage() {
  const infoLockRef = useRef(false);
  const voteLockRef = useRef(false);

  const [step, setStep] = useState<Step>("info");

  const [form, setForm] = useState<VoterInfo>({
    generation: "",
    name: "",
    phoneLast4: "",
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [submitErrorMessage, setSubmitErrorMessage] = useState("");
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isGoingNext, setIsGoingNext] = useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [isPollClosed, setIsPollClosed] = useState(() => getIsPollClosed());

  const selectedOption = SHIRT_OPTIONS.find(
    (option) => option.id === selectedOptionId,
  );

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setIsPollClosed(getIsPollClosed());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  const validateForm = (values: VoterInfo) => {
    if (!/^[0-9]{2}$/.test(values.generation)) {
      return "기수는 숫자 2자리로 입력해주세요. 예: 00";
    }

    if (values.name.length < 1) {
      return "이름을 입력해주세요.";
    }

    if (values.name.length > 30) {
      return "이름은 30자 이내로 입력해주세요.";
    }

    if (!/^[0-9]{4}$/.test(values.phoneLast4)) {
      return "전화번호 뒷자리는 숫자 4자리로 입력해주세요. 예: 1234";
    }

    return "";
  };

  const handleGenerationChange = (value: string) => {
    const cleaned = onlyNumbers(value).slice(0, 2);

    setForm((prev) => ({
      ...prev,
      generation: cleaned,
    }));
  };

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
    }));
  };

  const handlePhoneLast4Change = (value: string) => {
    const cleaned = onlyNumbers(value).slice(0, 4);

    setForm((prev) => ({
      ...prev,
      phoneLast4: cleaned,
    }));
  };

  const handleInfoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (infoLockRef.current) {
      return;
    }

    if (getIsPollClosed()) {
      setIsPollClosed(true);
      return;
    }

    infoLockRef.current = true;
    setIsGoingNext(true);

    const normalizedForm = normalizeForm(form);
    const validationMessage = validateForm(normalizedForm);

    setForm(normalizedForm);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      setIsGoingNext(false);
      infoLockRef.current = false;
      return;
    }

    setErrorMessage("");
    setStep("select");
  };

  const openConfirmModal = (optionId: string) => {
    if (isSubmittingVote) {
      return;
    }

    if (getIsPollClosed()) {
      setIsPollClosed(true);
      return;
    }

    setSubmitErrorMessage("");
    setSelectedOptionId(optionId);
    setIsConfirmOpen(true);
  };

  const confirmVote = async () => {
    if (voteLockRef.current || !selectedOption) {
      return;
    }

    voteLockRef.current = true;
    setIsSubmittingVote(true);
    setSubmitErrorMessage("");

    try {
      if (getIsPollClosed()) {
        throw new Error(POLL_CLOSED_MESSAGE);
      }

      const normalizedForm = normalizeForm(form);

      const response = await fetch("/api/votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          generation: normalizedForm.generation,
          name: normalizedForm.name,
          phoneLast4: normalizedForm.phoneLast4,
          optionId: selectedOption.id,
        }),
      });

      const result = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "투표 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
        );
      }

      setForm(normalizedForm);
      setIsConfirmOpen(false);
      setStep("done");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "투표 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";

      if (message === POLL_CLOSED_MESSAGE) {
        setIsPollClosed(true);
      }

      setSubmitErrorMessage(message);
      setIsSubmittingVote(false);
      voteLockRef.current = false;
    }
  };

  if (isPollClosed && step !== "done") {
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
              Vote Closed
            </p>
          </header>

          <section className="flex flex-1 flex-col justify-center">
            <p className="font-latin text-sm font-bold uppercase tracking-[0.18em] text-[#006EE9]">
              Closed
            </p>

            <h1 className="mt-8 text-[54px] font-black leading-[1.18] tracking-[-0.08em] text-[#000181]">
              투표가
              <br />
              종료되었습니다.
            </h1>

            <p className="mt-10 text-[17px] font-bold leading-9 tracking-[-0.04em] text-[#000181]/72">
              결과를 집계 중이니
              <br />
              선교사님들 잠시만 기다려주세요.
            </p>

            <section className="mt-12">
              <Countdown />
            </section>
          </section>

          <Link
            href="/"
            className="block border-2 border-[#000181] bg-[#006EE9] px-5 py-5 text-center text-lg font-black tracking-[-0.04em] text-[#FDFEFF] transition hover:bg-[#000181] active:translate-x-1 active:translate-y-1"
          >
            처음 화면으로
          </Link>
        </section>
      </main>
    );
  }

  if (step === "done") {
    return (
      <main className="min-h-screen bg-[#FDFEFF] px-5 py-5 text-[#000181]">
        <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-md flex-col">
          <header className="flex items-start justify-between border-b-2 border-[#000181] pb-4">
            <p className="font-latin text-sm font-bold leading-none tracking-[-0.04em]">
              Summer Mission
            </p>
            <p className="font-latin text-xs font-bold uppercase tracking-[0.16em] text-[#006EE9]">
              여름 단기선교 단체 티셔츠
            </p>
          </header>

          <section className="flex flex-1 flex-col justify-center">
            <p className="font-latin text-sm font-bold uppercase tracking-[0.18em] text-[#006EE9]">
              1
            </p>

            <h1 className="mt-8 text-[56px] font-black leading-[1.18] tracking-[-0.08em] text-[#000181]">
              투표가
              <br />
              완료되었습니다!
            </h1>

            <p className="mt-10 text-[17px] font-bold leading-9 tracking-[-0.04em] text-[#000181]/72">
              당신의 한 표가
              <br />
              이번 선교의 여정에 함께했습니다.
            </p>

            <div className="mt-12 border-y-2 border-[#000181]">
              <div className="grid grid-cols-[68px_1fr] border-b-2 border-[#000181]">
                <div className="grid min-h-16 place-items-center border-r-2 border-[#000181] bg-[#D0FFA4] font-latin text-lg font-bold">
                  01
                </div>
                <div className="flex min-h-16 items-center px-4 text-sm font-bold leading-7 tracking-[-0.035em]">
                  결과는 투표 종료 후 공개됩니다.
                </div>
              </div>

              <div className="grid grid-cols-[68px_1fr]">
                <div className="grid min-h-16 place-items-center border-r-2 border-[#000181] font-latin text-lg font-bold">
                  02
                </div>
                <div className="flex min-h-16 items-center px-4 text-sm font-bold leading-7 tracking-[-0.035em]">
                  본 투표는 1인 1표만 인정됩니다.
                </div>
              </div>
            </div>
          </section>

          <Link
            href="/"
            className="block border-2 border-[#000181] bg-[#006EE9] px-5 py-5 text-center text-lg font-black tracking-[-0.04em] text-[#FDFEFF] transition hover:bg-[#000181] active:translate-x-1 active:translate-y-1"
          >
            처음 화면으로
          </Link>
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
            className="font-latin text-sm font-bold leading-none tracking-[-0.04em] text-[#000181]"
          >
            ← Back
          </Link>

          <p className="font-latin text-xs font-bold uppercase tracking-[0.16em] text-[#006EE9]">
            1청년함대
          </p>
        </header>

        <section className="pt-6">
          <Countdown />
        </section>

        {step === "info" && (
          <section className="pt-10">
            <p className="font-latin text-sm font-bold uppercase tracking-[0.18em] text-[#006EE9]">
              Summer Mission
            </p>

            <h1 className="mt-8 text-[48px] font-black leading-[1.2] tracking-[-0.08em] text-[#000181]">
              투표자 정보를
              <br />
              입력해주세요
            </h1>

            <p className="mt-8 text-[15px] font-bold leading-8 tracking-[-0.04em] text-[#000181]/65">
              공정한 투표를 위해 기수, 이름,
              <br />
              전화번호 뒷자리를 입력해주세요.
            </p>

            <form onSubmit={handleInfoSubmit} className="mt-10">
              <div className="border-2 border-[#000181]">
                <div className="grid grid-cols-[92px_1fr] border-b-2 border-[#000181]">
                  <label className="flex min-h-20 items-center border-r-2 border-[#000181] bg-[#D0FFA4] px-4 text-sm font-black tracking-[-0.04em]">
                    기수
                  </label>

                  <div className="grid grid-cols-[1fr_40px]">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={form.generation}
                      onChange={(event) =>
                        handleGenerationChange(event.target.value)
                      }
                      placeholder="00"
                      autoComplete="off"
                      className="min-h-20 w-full bg-[#FDFEFF] px-4 text-2xl font-black tracking-[-0.05em] text-[#000181] outline-none placeholder:text-[#000181]/25"
                    />

                    <span className="flex items-center justify-center text-lg font-black text-[#006EE9]">
                      기
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-[92px_1fr] border-b-2 border-[#000181]">
                  <label className="flex min-h-20 items-center border-r-2 border-[#000181] px-4 text-sm font-black tracking-[-0.04em]">
                    이름
                  </label>

                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => handleNameChange(event.target.value)}
                    placeholder="홍길동"
                    autoComplete="name"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    maxLength={30}
                    className="min-h-20 w-full bg-[#FDFEFF] px-4 text-2xl font-black tracking-[-0.05em] text-[#000181] outline-none placeholder:text-[#000181]/25"
                  />
                </div>

                <div className="grid grid-cols-[92px_1fr]">
                  <label className="flex min-h-20 items-center border-r-2 border-[#000181] px-4 text-sm font-black leading-6 tracking-[-0.04em]">
                    전화번호
                    <br />
                    뒷자리
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={form.phoneLast4}
                    onChange={(event) =>
                      handlePhoneLast4Change(event.target.value)
                    }
                    placeholder="1234"
                    autoComplete="off"
                    className="min-h-20 w-full bg-[#FDFEFF] px-4 text-2xl font-black tracking-[-0.05em] text-[#000181] outline-none placeholder:text-[#000181]/25"
                  />
                </div>
              </div>

              <div className="mt-7 border-y-2 border-[#000181] py-4">
                <p className="text-sm font-bold leading-8 tracking-[-0.035em] text-[#000181]/70">
                  본 투표는 1인 1표만 인정됩니다.
                  <br />
                  중복 투표가 확인될 경우 관리자 확인 후 무효표로 처리될 수
                  있습니다.
                </p>
              </div>

              {errorMessage && (
                <div className="mt-5 border-2 border-[#000181] bg-[#D0FFA4] px-4 py-4 text-sm font-black leading-7 tracking-[-0.035em] text-[#000181]">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isGoingNext}
                className="mt-8 block w-full border-2 border-[#000181] bg-[#006EE9] px-5 py-5 text-center text-lg font-black tracking-[-0.04em] text-[#FDFEFF] transition hover:bg-[#000181] active:translate-x-1 active:translate-y-1 disabled:opacity-50"
              >
                {isGoingNext ? "확인 중..." : "다음으로"}
              </button>
            </form>
          </section>
        )}

        {step === "select" && (
          <section className="pt-10">
            <p className="font-latin text-sm font-bold uppercase tracking-[0.18em] text-[#006EE9]">
              함대 프로듀서님!!
            </p>

            <h1 className="mt-8 text-[46px] font-black leading-[1.2] tracking-[-0.08em] text-[#000181]">
              이번 여름
              <br />
              함께할 단체티를
              <br />
              선택해주세요
            </h1>

            <div className="mt-9 grid grid-cols-[92px_1fr] border-2 border-[#000181]">
              <div className="flex min-h-16 items-center border-r-2 border-[#000181] bg-[#D0FFA4] px-4 font-latin text-sm font-bold">
                Voter
              </div>

              <div className="flex min-h-16 items-center px-4 text-sm font-black leading-6 tracking-[-0.035em]">
                {form.generation}기 / {form.name} / 뒷자리 {form.phoneLast4}
              </div>
            </div>

            <div className="mt-10 space-y-10">
              {SHIRT_OPTIONS.map((option) => (
                <article key={option.id} className="border-2 border-[#000181]">
                  <div className="grid grid-cols-[1fr_92px] border-b-2 border-[#000181]">
                    <div className="px-4 py-5">
                      <p className="font-latin text-xs font-bold uppercase tracking-[0.18em] text-[#006EE9]">
                        Candidate
                      </p>

                      <h2 className="mt-4 text-[34px] font-black leading-[1.15] tracking-[-0.07em] text-[#000181]">
                        {option.title}
                      </h2>
                    </div>

                    <div className="grid place-items-center border-l-2 border-[#000181] bg-[#006EE9]">
                      <p className="font-latin text-[42px] font-bold leading-none tracking-[-0.08em] text-[#FDFEFF]">
                        {option.number}
                      </p>
                    </div>
                  </div>

                  <div className="p-4">
                    <CandidateImage
                      src={option.imageSrc}
                      alt={option.title}
                      number={option.number}
                    />

                    <p className="mt-5 min-h-14 text-sm font-bold leading-8 tracking-[-0.035em] text-[#000181]/68">
                      {option.description}
                    </p>

                    <button
                      type="button"
                      disabled={isSubmittingVote || isPollClosed}
                      onClick={() => openConfirmModal(option.id)}
                      className="mt-5 block w-full border-2 border-[#000181] bg-[#000181] px-5 py-5 text-center text-base font-black tracking-[-0.04em] text-[#FDFEFF] transition hover:bg-[#006EE9] active:translate-x-1 active:translate-y-1 disabled:opacity-50"
                    >
                      PICK ME !!
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>

      {isConfirmOpen && selectedOption && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#000181]/70 px-5">
          <section className="w-full max-w-sm border-2 border-[#000181] bg-[#FDFEFF]">
            <div className="border-b-2 border-[#000181] px-5 py-4">
              <p className="font-latin text-sm font-bold uppercase tracking-[0.18em] text-[#006EE9]">
                Confirm
              </p>
            </div>

            <div className="px-5 py-8 text-center">
              <h2 className="text-[36px] font-black leading-[1.25] tracking-[-0.075em] text-[#000181]">
                후보 {selectedOption.number}번에게
                <br />
                투표할까요?
              </h2>

              <p className="mt-7 text-sm font-bold leading-8 tracking-[-0.035em] text-[#000181]/65">
                투표 제출 후에는 변경할 수 없습니다.
                <br />
                중복 투표는 무효표로 처리될 수 있습니다.
              </p>

              {submitErrorMessage && (
                <div className="mt-6 border-2 border-[#000181] bg-[#D0FFA4] px-4 py-4 text-sm font-black leading-7 tracking-[-0.035em] text-[#000181]">
                  {submitErrorMessage}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 border-t-2 border-[#000181]">
              <button
                type="button"
                disabled={isSubmittingVote}
                onClick={() => setIsConfirmOpen(false)}
                className="min-h-16 border-r-2 border-[#000181] bg-[#FDFEFF] text-sm font-black tracking-[-0.035em] text-[#000181] transition hover:bg-[#D0FFA4] disabled:opacity-50"
              >
                취소
              </button>

              <button
                type="button"
                disabled={isSubmittingVote}
                onClick={confirmVote}
                className="min-h-16 bg-[#006EE9] text-sm font-black tracking-[-0.035em] text-[#FDFEFF] transition hover:bg-[#000181] disabled:opacity-50"
              >
                {isSubmittingVote ? "저장 중..." : "투표 확정"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}