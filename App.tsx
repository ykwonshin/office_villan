import React, { useState, useEffect, useCallback } from 'react';
import type { Character, Dialogue } from './types';
import { GamePhase, Role } from './types';
import WelcomeScreen from './components/WelcomeScreen';
import EndScreen from './components/EndScreen';
import CharacterCard from './components/CharacterCard';
import DialogueLog from './components/DialogueLog';
import LoadingSpinner from './components/LoadingSpinner';
import * as geminiService from './services/geminiService';

const App: React.FC = () => {
    const [gamePhase, setGamePhase] = useState<GamePhase>(GamePhase.WELCOME);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [dialogueLog, setDialogueLog] = useState<Dialogue[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [day, setDay] = useState(1);
    const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
    const [question, setQuestion] = useState('');
    const [askedCharacters, setAskedCharacters] = useState<string[]>([]);

    const addLog = useCallback((speaker: string, message: string) => {
        setDialogueLog(prev => [...prev, { speaker, message }]);
    }, []);

    const resetGame = () => {
        setGamePhase(GamePhase.WELCOME);
        setCharacters([]);
        setDialogueLog([]);
        setIsLoading(false);
        setDay(1);
        setSelectedCharacter(null);
        setQuestion('');
        setAskedCharacters([]);
    };

    const handleStartGame = useCallback(async () => {
        setGamePhase(GamePhase.SETUP);
        setIsLoading(true);
        setLoadingMessage('게임 환경을 설정하는 중...');
        const { companyBackground, characters: initialCharacters } = await geminiService.setupGame();

        const villainIndex = Math.floor(Math.random() * initialCharacters.length);
        const playerIndex = (villainIndex + 1 + Math.floor(Math.random() * (initialCharacters.length -1))) % initialCharacters.length;

        const fullCharacters: Character[] = initialCharacters.map((char, index) => ({
            ...char,
            role: index === villainIndex ? Role.VILLAIN : Role.COLLEAGUE,
            isPlayer: index === playerIndex,
            isAlive: true,
            avatarUrl: `https://i.pravatar.cc/150?u=${char.name}`
        }));
        
        setCharacters(fullCharacters);
        setDialogueLog([{ speaker: 'system', message: companyBackground }]);
        const player = fullCharacters.find(c => c.isPlayer);
        addLog('system', `당신은 ${player?.title} ${player?.name}입니다. 당신의 역할은 '${player?.role}' 입니다. 오피스 빌런을 찾아내세요.`);
        
        setTimeout(() => {
            setIsLoading(false);
            setGamePhase(GamePhase.DAY_INTRO);
        }, 2000);
    }, [addLog]);

    const checkEndCondition = useCallback(() => {
        const aliveCharacters = characters.filter(c => c.isAlive);
        const villain = aliveCharacters.find(c => c.role === Role.VILLAIN);
        const colleagues = aliveCharacters.filter(c => c.role === Role.COLLEAGUE);
        const player = aliveCharacters.find(c => c.isPlayer);

        if (!villain) {
            setGamePhase(GamePhase.END_WIN);
            return true;
        }
        if (!player) {
            setGamePhase(GamePhase.END_LOSE);
            return true;
        }
        if (colleagues.length <= 1) { // Villain wins if it's 1 vs 1
            setGamePhase(GamePhase.END_LOSE);
            return true;
        }
        return false;
    }, [characters]);

    const handleCharacterSelect = (name: string) => {
        if (gamePhase === GamePhase.VOTING || gamePhase === GamePhase.DAY_DISCUSSION) {
            const character = characters.find(c => c.name === name);
            if (character?.isAlive && !character?.isPlayer) {
              setSelectedCharacter(name);
            }
        }
    };

    const handleConfirmVote = async () => {
        if (!selectedCharacter) return;

        const player = characters.find(c => c.isPlayer);
        if (!player) return;

        setIsLoading(true);
        setLoadingMessage('동료들의 투표를 집계하는 중...');
        
        const playerVote = { voter: player.name, votee: selectedCharacter };

        const npcVotes = await geminiService.getNpcVotes(characters, playerVote, dialogueLog);
        
        const allVotes = [playerVote, ...npcVotes];
        
        addLog('system', '=== 투표 결과 ===');
        allVotes.forEach(vote => {
            const reason = (vote as any).reason ? ` (이유: ${(vote as any).reason})` : '';
            addLog('system', `${vote.voter} 님 ➞ ${vote.votee} 님${reason}`);
        });

        const voteCounts = allVotes.reduce((acc, vote) => {
            acc[vote.votee] = (acc[vote.votee] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        let maxVotes = 0;
        let eliminatedTargets: string[] = [];
        for (const target in voteCounts) {
            if (voteCounts[target] > maxVotes) {
                maxVotes = voteCounts[target];
                eliminatedTargets = [target];
            } else if (voteCounts[target] === maxVotes && maxVotes > 0) {
                eliminatedTargets.push(target);
            }
        }

        setTimeout(async () => {
            if (eliminatedTargets.length === 1) {
                const eliminatedName = eliminatedTargets[0];
                const voteTarget = characters.find(c => c.name === eliminatedName);
                addLog('system', `투표 결과, ${eliminatedName}님이 가장 많은 표를 받아 해고되었습니다.`);
                
                if (voteTarget) {
                    const finalWords = await geminiService.getVoteResult(characters, voteTarget.name);
                    addLog(voteTarget.name, finalWords);
                }

                setTimeout(() => {
                    setCharacters(chars => chars.map(c => c.name === eliminatedName ? { ...c, isAlive: false } : c));
                    setSelectedCharacter(null);
                    setIsLoading(false);
                    setGamePhase(GamePhase.VOTE_RESULT);
                }, 3000);

            } else {
                addLog('system', '투표 결과가 동률이 되어 아무도 해고되지 않았습니다.');
                setSelectedCharacter(null);
                setIsLoading(false);
                setGamePhase(GamePhase.VOTE_RESULT);
            }
        }, 3000);
    };

    const handleAskQuestion = async () => {
        if (!selectedCharacter || !question.trim() || askedCharacters.includes(selectedCharacter)) return;

        const target = characters.find(c => c.name === selectedCharacter);
        if (!target) return;

        setIsLoading(true);
        setLoadingMessage(`${target.name}님이 답변을 생각하는 중...`);
        addLog('system', `당신이 ${target.name}님에게 질문합니다: "${question}"`);
        
        const response = await geminiService.getPlayerQuestionResponse(target, question);
        addLog(target.name, response);

        setAskedCharacters(prev => [...prev, selectedCharacter]);
        setQuestion('');
        setIsLoading(false);
    };

    useEffect(() => {
        if (gamePhase === GamePhase.DAY_INTRO) {
            setIsLoading(true);
            setLoadingMessage(`${day}일차 아침...`);
            setAskedCharacters([]);

            const runDayIntro = async () => {
                addLog('system', `=== ${day}일차 아침 ===`);
                const { incident, dialogues } = await geminiService.generateDayIntro(characters, day);
                addLog('system', `사건 발생: ${incident}`);
                
                setTimeout(() => {
                    Object.entries(dialogues).forEach(([name, message]) => {
                        if (characters.find(c => c.name === name && c.isAlive)) {
                            addLog(name, message);
                        }
                    });
                    setIsLoading(false);
                    setGamePhase(GamePhase.DAY_DISCUSSION);
                }, 2000);
            };
            runDayIntro();
        } else if (gamePhase === GamePhase.VOTE_RESULT) {
            if (!checkEndCondition()) {
                setTimeout(() => {
                    setGamePhase(GamePhase.NIGHT);
                }, 3000);
            }
        } else if (gamePhase === GamePhase.NIGHT) {
            setIsLoading(true);
            setLoadingMessage('밤이 되었습니다...');
            
            const runNight = async () => {
                addLog('system', '밤이 깊어지고... 오피스 빌런이 움직이기 시작합니다.');
                const { eliminated, reason } = await geminiService.getNightResult(characters);
                setTimeout(() => {
                    if (eliminated) {
                        addLog('system', `다음 날 아침, ${eliminated}님의 자리가 비어있습니다. 사유: ${reason}`);
                        setCharacters(chars => chars.map(c => c.name === eliminated ? { ...c, isAlive: false } : c));
                    } else {
                        addLog('system', '아무 일도 일어나지 않았습니다.');
                    }
                    setIsLoading(false);
                    if (!checkEndCondition()) {
                        setDay(d => d + 1);
                        setGamePhase(GamePhase.DAY_INTRO);
                    }
                }, 4000);
            };
            runNight();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gamePhase]);
    

    const renderGameScreen = () => (
        <div className="min-h-screen bg-gray-900 p-4 flex flex-col lg:flex-row gap-4">
            {/* Characters */}
            <div className="lg:w-1/4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-4 content-start">
                {characters.map(char => (
                    <CharacterCard 
                        key={char.name} 
                        character={char} 
                        onSelect={handleCharacterSelect}
                        isSelectable={!char.isPlayer && (gamePhase === GamePhase.DAY_DISCUSSION || gamePhase === GamePhase.VOTING)}
                        isPlayer={char.isPlayer}
                    />
                ))}
            </div>

            {/* Main Panel */}
            <div className="flex-1 flex flex-col gap-4" style={{ height: 'calc(100vh - 2rem)' }}>
                {/* Dialogue */}
                <div className="flex-1 bg-gray-800 rounded-lg p-2 shadow-inner overflow-hidden">
                    <DialogueLog logs={dialogueLog} />
                </div>

                {/* Actions */}
                <div className="h-48 bg-gray-800 rounded-lg p-4 shadow-inner flex flex-col justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-blue-300">
                           {gamePhase === GamePhase.DAY_DISCUSSION && '토론 시간'}
                           {gamePhase === GamePhase.VOTING && '투표 시간'}
                           {(gamePhase === GamePhase.DAY_INTRO || gamePhase === GamePhase.NIGHT || gamePhase === GamePhase.VOTE_RESULT) && '상황 전개'}
                        </h2>
                        <p className="text-gray-400">
                            {gamePhase === GamePhase.DAY_DISCUSSION && '각 동료에게 한 번씩 질문하여 단서를 얻으세요.'}
                            {gamePhase === GamePhase.VOTING && '오피스 빌런으로 의심되는 동료에게 투표하세요.'}
                            {(gamePhase === GamePhase.DAY_INTRO || gamePhase === GamePhase.NIGHT || gamePhase === GamePhase.VOTE_RESULT) && '무슨 일이 일어나는지 지켜보세요.'}
                        </p>
                    </div>

                    {gamePhase === GamePhase.DAY_DISCUSSION && (
                        <div className="flex gap-2 items-center">
                            <input 
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                placeholder={
                                    !selectedCharacter ? '질문할 대상을 선택하세요' :
                                    askedCharacters.includes(selectedCharacter) ? `${selectedCharacter}에게는 이미 질문했습니다.` :
                                    `${selectedCharacter}에게 질문하기...`
                                }
                                disabled={!selectedCharacter || askedCharacters.includes(selectedCharacter)}
                                className="flex-1 bg-gray-700 p-2 rounded disabled:opacity-50"
                            />
                            <button onClick={handleAskQuestion} disabled={!selectedCharacter || !question.trim() || askedCharacters.includes(selectedCharacter)} className="px-4 py-2 bg-blue-600 rounded disabled:bg-gray-600">
                                {selectedCharacter && askedCharacters.includes(selectedCharacter) ? '질문 완료' : '전송'}
                            </button>
                            <button onClick={() => setGamePhase(GamePhase.VOTING)} className="px-4 py-2 bg-green-600 rounded">투표 시작</button>
                        </div>
                    )}
                    
                    {gamePhase === GamePhase.VOTING && (
                        <div className="flex gap-2 items-center justify-center">
                           <p className="text-lg">선택: <span className="font-bold text-yellow-400">{selectedCharacter || '없음'}</span></p>
                           <button onClick={handleConfirmVote} disabled={!selectedCharacter} className="px-6 py-3 bg-red-600 text-lg font-bold rounded disabled:bg-gray-600">
                                이 사람에게 투표하기
                           </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );


    switch (gamePhase) {
        case GamePhase.WELCOME:
            return <WelcomeScreen onStart={handleStartGame} />;
        case GamePhase.END_WIN:
        case GamePhase.END_LOSE:
            return <EndScreen win={gamePhase === GamePhase.END_WIN} villain={characters.find(c => c.role === Role.VILLAIN)} onRestart={resetGame} />;
        default:
            return (
                <>
                    {isLoading && <LoadingSpinner message={loadingMessage} />}
                    {renderGameScreen()}
                </>
            );
    }
};

export default App;