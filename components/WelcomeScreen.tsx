
import React from 'react';

interface WelcomeScreenProps {
  onStart: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-blue-400 tracking-wider">오피스 빌런</h1>
        <p className="mt-4 text-lg md:text-xl text-gray-300">사무실에 숨어든 빌런을 찾아내세요!</p>
      </div>
      <div className="mt-12 text-left max-w-2xl bg-gray-800 p-6 rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold mb-4 text-blue-300">게임 방법</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-200">
          <li>당신은 평범한 직장인, '선량한 동료'입니다.</li>
          <li>동료들 중에 숨어있는 '오피스 빌런'이 매일 밤마다 사건을 일으킵니다.</li>
          <li>낮 동안 동료들과 대화하여 단서를 찾고, 의심스러운 사람에게 질문하세요.</li>
          <li>투표를 통해 가장 의심스러운 동료를 해고하여 빌런을 찾아내세요.</li>
          <li>빌런을 찾아내면 승리, 선량한 동료가 모두 해고되면 패배합니다.</li>
        </ul>
      </div>
      <button
        onClick={onStart}
        className="mt-12 px-8 py-4 bg-blue-600 text-white font-bold text-xl rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 shadow-lg"
      >
        게임 시작
      </button>
    </div>
  );
};

export default WelcomeScreen;
