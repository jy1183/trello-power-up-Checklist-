'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export default function Connector() {
  useEffect(() => {
    // TrelloPowerUp은 Script가 로드된 이후에 window에 생깁니다.
    const initTrello = () => {
      if ((window as any).TrelloPowerUp) {
        (window as any).TrelloPowerUp.initialize({
          'board-buttons': function (t: any, options: any) {
            return [
              {
                icon: 'https://p.trellocdn.com/power-up/power-up-24.png',
                text: '전체 체크리스트 보기',
                condition: 'always',
                callback: function (t: any) {
                  return t.modal({
                    title: '통합 체크리스트',
                    url: '/checklist-modal',
                    fullscreen: true,
                  });
                },
              },
            ];
          },
        });
      }
    };

    // 만약 이미 스크립트가 로드되어 있다면 바로 실행
    if ((window as any).TrelloPowerUp) {
      initTrello();
    } else {
      // 스크립트가 로드될 때까지 기다리기 위해 interval 설정 (onLoad 대안)
      const interval = setInterval(() => {
        if ((window as any).TrelloPowerUp) {
          initTrello();
          clearInterval(interval);
        }
      }, 100);
      // 10초 후에는 clear
      setTimeout(() => clearInterval(interval), 10000);
    }
  }, []);

  return (
    <>
      <Script src="https://p.trellocdn.com/power-up.min.js" strategy="beforeInteractive" />
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <p>Trello Power-Up Connector is loading...</p>
      </div>
    </>
  );
}
