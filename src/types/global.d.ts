export {};

declare global {
  interface Window {
    /** 성경 읽기 셸이 마운트돼 있을 때만 존재. 하단바의 이전/다음 장 버튼이
     * 이 함수를 통해 셸의 클라이언트 주도 장 이동을 트리거한다. */
    __bnoteBibleShellNavigate?: (direction: "prev" | "next") => void;
    /** 성경 읽기 셸이 마운트돼 있을 때만 존재. 책/장/절 피커처럼 인접하지 않은
     * 임의의 장으로 옮길 때 이 함수를 통해 클라이언트 주도로 이동한다. */
    __bnoteBibleShellGoTo?: (bookId: number, chapter: number, verse?: number) => void;
  }
}