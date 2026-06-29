import type { AttendanceStatusValue } from "@/app/actions";

// P5: 상세 페이지에서 SWR로 폴링하는 라이브 데이터(참석 명단 + 댓글) 공유 형태.
// 서버 초기 로드(page)·폴링 엔드포인트(route)·클라이언트(EventLive)가 같은 형태를 쓴다.
export type RosterUser = { name: string; avatarColor: string | null };

export type EventComment = {
  id: string;
  body: string;
  authorName: string;
  avatarColor: string | null;
  createdAt: string; // ISO 문자열 (표시는 KST로 클라에서 포맷)
};

export type EventLiveData = {
  myStatus: AttendanceStatusValue | null;
  roster: {
    going: RosterUser[];
    maybe: RosterUser[];
    notGoing: RosterUser[];
    noResponse: RosterUser[];
  };
  comments: EventComment[];
};
