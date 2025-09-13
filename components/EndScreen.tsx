
import React from 'react';
import type { Character } from '../types';
import { Role } from '../types';

interface EndScreenProps {
  win: boolean;
  villain: Character | undefined;
  onRestart: () => void;
}

const EndScreen: React.FC<EndScreenProps> = ({ win, villain, onRestart }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4 text-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-2xl max-w-md w-full">
        {win ? (
          <>
            <h1 className="text-5xl font-bold text-green-400">승리!</h1>
            <p className="mt-4 text-xl">사무실에 평화가 찾아왔습니다.</p>
          </>
        ) : (
          <>
            <h1 className="text-5xl font-bold text-red-500">패배...</h1>
            <p className="mt-4 text-xl">오피스 빌런이 회사를 장악했습니다.</p>
          </>
        )}
        {villain && (
          <div className="mt-8">
            <p className="text-lg">이번 게임의 오피스 빌런은...</p>
            <div className="mt-4 inline-block bg-gray-700 p-4 rounded-lg">
                <img src={villain.avatarUrl} alt={villain.name} className="w-24 h-24 rounded-full mx-auto border-4 border-red-500" />
                <p className="text-2xl font-bold mt-2">{villain.name}</p>
                <p className="text-md text-gray-400">{villain.title}</p>
            </div>
          </div>
        )}
        <button
          onClick={onRestart}
          className="mt-10 px-8 py-3 bg-blue-600 text-white font-bold text-lg rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105"
        >
          다시하기
        </button>
      </div>
    </div>
  );
};

export default EndScreen;
