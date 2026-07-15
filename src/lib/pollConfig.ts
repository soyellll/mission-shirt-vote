export const POLL_CLOSE_AT = "2026-07-22T00:00:00+09:00";

export const POLL_CLOSE_AT_LABEL = "2026.07.22 00:00 KST";

export const POLL_CLOSED_MESSAGE =
  "투표가 종료되었습니다. 결과를 집계 중이니 선교사님들 잠시만 기다려주세요.";

export const VOTE_OPTIONS = [
  {
    id: "shirt-01",
    number: "01",
    title: "일!주일!티",
    description: "나의 하루가 정신없이 흘러갈지라도 주님을 한 번 생각해 보아요~",
  },
  {
    id: "shirt-02",
    number: "02",
    title: "큐티~셔츠",
    description: "있잖아, 난 귀여워. 왜냐고? ↑↑↑↑↑↑↑",
  },
  {
    id: "shirt-03",
    number: "03",
    title: "아럽지저스",
    description: "아럽 지저스~ 옛 아 두~♪ 아럽 지저스~ 하우 어밧 유~♫",
  },
] as const;

export const VALID_OPTION_IDS = ["shirt-01", "shirt-02", "shirt-03"] as const;

export const getIsPollClosed = (now = new Date()) => {
  return now.getTime() >= new Date(POLL_CLOSE_AT).getTime();
};
