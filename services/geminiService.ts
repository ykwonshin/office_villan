import { GoogleGenAI, Type } from "@google/genai";
// FIX: 'Role' was imported as a type-only import, but is used as a value.
// Changed to a value import for `Role` and a type-only import for `Character`.
import { type Character, Role, type Dialogue } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const model = 'gemini-2.5-flash';

const characterSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      title: { type: Type.STRING },
    },
    required: ["name", "title"],
  },
};

export const setupGame = async (): Promise<{ companyBackground: string; characters: Omit<Character, 'role' | 'isPlayer' | 'isAlive' | 'avatarUrl'>[] }> => {
  try {
    const response = await ai.models.generateContent({
      model,
      contents: `오피스 마피아 게임 '오피스 빌런'의 배경 설정을 만들어줘. 게임에는 6명의 캐릭터가 필요해. 
      평범한 한국 회사 사무실에서 볼 수 있는 직책과 이름으로 6명을 생성해줘.
      그리고 게임이 진행될 가상의 회사에 대한 짧은 배경 스토리도 한 문단으로 만들어줘.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            companyBackground: { type: Type.STRING },
            characters: characterSchema,
          },
          required: ["companyBackground", "characters"],
        },
      },
    });
    const result = JSON.parse(response.text);
    return result;
  } catch (error) {
    console.error("Error setting up game:", error);
    // Fallback data in case of API error
    return {
      companyBackground: "혁신적인 IT 솔루션을 제공하는 스타트업 '넥스트코드'의 사무실입니다. 최근 중요한 프로젝트 마감을 앞두고 팀원들 사이에 미묘한 긴장감이 흐르고 있습니다.",
      characters: [
        { name: "김민준", title: "프로젝트 매니저" },
        { name: "이서연", title: "UX/UI 디자이너" },
        { name: "박도현", title: "백엔드 개발자" },
        { name: "최지우", title: "프론트엔드 개발자" },
        { name: "정하윤", title: "QA 엔지니어" },
        { name: "강태호", title: "데이터 분석가" },
      ],
    };
  }
};

export const generateDayIntro = async (characters: Character[], day: number): Promise<{ incident: string; dialogues: { [key: string]: string } }> => {
  const villain = characters.find(c => c.role === 'Office Villain' && c.isAlive);
  const aliveCharacters = characters.filter(c => c.isAlive);

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `오피스 빌런 게임 ${day}일차 아침입니다. 사무실에서 발생한 새로운 사건 하나와, 그 사건에 대한 각 캐릭터들의 첫 대사를 생성해줘.
      - 사건: 직원들의 사기를 떨어뜨리거나 업무를 방해하는 가벼운 사건. (예: 커피머신 고장, 중요 파일 이름 변경 등)
      - 캐릭터: ${aliveCharacters.map(c => `${c.name}(${c.title})`).join(', ')}
      - 오피스 빌런: ${villain?.name}
      
      오피스 빌런의 대사는 교묘하게 의심을 다른 사람에게 돌리거나, 상황을 즐기는 듯한 뉘앙스를 풍겨야 해.
      다른 사람들은 평범하게 반응하거나, 짜증을 내거나, 해결책을 찾으려는 등 자연스러운 반응을 보여야 해.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            incident: { type: Type.STRING },
            dialogues: {
              type: Type.OBJECT,
              properties: aliveCharacters.reduce((acc, char) => ({ ...acc, [char.name]: { type: Type.STRING } }), {})
            },
          },
          required: ["incident", "dialogues"],
        },
      },
    });
    return JSON.parse(response.text);
  } catch(error) {
    console.error("Error generating day intro:", error);
    return {
      incident: "누군가 사무실 공용 냉장고에 있던 간식을 전부 먹어버렸습니다!",
      dialogues: aliveCharacters.reduce((acc, char) => ({...acc, [char.name]: `${char.name}: 아, 내 간식...`}), {})
    }
  }
};

export const getPlayerQuestionResponse = async (character: Character, question: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model,
            contents: `오피스 빌런 게임 상황입니다. 플레이어가 ${character.name}(${character.title})에게 다음과 같이 질문했습니다.
            질문: "${question}"
            ${character.name}의 역할은 '${character.role}'입니다. 이 역할에 충실하면서 짧고 자연스러운 답변을 생성해줘.
            만약 '${Role.VILLAIN}'이라면, 교묘하게 거짓말을 하거나 화제를 돌리며 의심을 피해야 합니다.
            만약 '${Role.COLLEAGUE}'라면, 솔직하게 아는 바를 답하거나 자신의 의견을 말해야 합니다.`
        });
        return response.text;
    } catch (error) {
        console.error("Error generating character response:", error);
        return "지금은 대답하기 곤란합니다.";
    }
};

export const getVoteResult = async (characters: Character[], voteTarget: string): Promise<string> => {
    const villain = characters.find(c => c.role === 'Office Villain');
    try {
        const response = await ai.models.generateContent({
            model,
            contents: `오피스 빌런 게임의 투표 시간입니다. ${voteTarget}이(가) 가장 많은 표를 받아 해고될 위기에 처했습니다.
            ${voteTarget}의 역할은 '${characters.find(c=>c.name === voteTarget)?.role}' 입니다.
            ${villain?.name}이(가) 오피스 빌런입니다.
            ${voteTarget}이(가) 마지막으로 남길 변명을 짧게 생성해줘. 역할에 맞는 억울하거나, 혹은 의미심장한 한마디여야 합니다.`
        });
        return response.text;
    } catch (error) {
        console.error("Error generating vote result dialogue:", error);
        return "할 말이 없습니다...";
    }
};


export const getNightResult = async (characters: Character[]): Promise<{ eliminated: string; reason: string }> => {
  const villain = characters.find(c => c.role === 'Office Villain' && c.isAlive);
  const colleagues = characters.filter(c => c.role === 'Good Colleague' && c.isAlive && !c.isPlayer);

  if (!villain || colleagues.length === 0) {
    return { eliminated: '', reason: '아무 일도 일어나지 않았습니다.' };
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `오피스 빌런 게임의 밤입니다. 오피스 빌런(${villain.name})이 선량한 동료 한 명을 지목해 해고시키려 합니다.
      - 대상자: ${colleagues.map(c => c.name).join(', ')}
      이들 중 한 명을 선택하고, 그를 해고시키는 이유를 그럴듯하게 한 문장으로 생성해줘.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            eliminated: { type: Type.STRING, description: `해고될 사람의 이름. 반드시 대상자 목록에 있는 이름이어야 함.` },
            reason: { type: Type.STRING, description: '해고시키는 이유.' },
          },
          required: ["eliminated", "reason"],
        },
      },
    });
    const result = JSON.parse(response.text);
    // Ensure the eliminated character is valid
    if (colleagues.some(c => c.name === result.eliminated)) {
        return result;
    } else {
        // Fallback if Gemini returns an invalid name
        const randomTarget = colleagues[Math.floor(Math.random() * colleagues.length)];
        return { eliminated: randomTarget.name, reason: `${randomTarget.name}의 성과가 저조하다는 익명의 투서가 발견되었습니다.`};
    }

  } catch (error) {
    console.error("Error generating night result:", error);
    const randomTarget = colleagues[Math.floor(Math.random() * colleagues.length)];
    return { eliminated: randomTarget.name, reason: `${randomTarget.name}의 성과가 저조하다는 익명의 투서가 발견되었습니다.`};
  }
};

export const getNpcVotes = async (characters: Character[], playerVote: {voter: string, votee: string}, dialogueLog: Dialogue[]): Promise<{voter: string, votee: string, reason: string}[]> => {
    const aliveCharacters = characters.filter(c => c.isAlive);
    const npcs = aliveCharacters.filter(c => !c.isPlayer);
    const villain = characters.find(c => c.role === Role.VILLAIN);

    const recentDialogues = dialogueLog.slice(-20).map(d => `${d.speaker}: ${d.message}`).join('\n');

    try {
        const response = await ai.models.generateContent({
            model,
            contents: `오피스 빌런 게임의 투표 시간입니다.
- 살아있는 캐릭터: ${aliveCharacters.map(c => `${c.name}(${c.title}, 역할: ${c.isPlayer ? '플레이어' : 'NPC'})`).join(', ')}
- 오피스 빌런: ${villain?.name}
- 플레이어(${playerVote.voter})는 ${playerVote.votee}에게 투표했습니다.
- 최근 대화:
${recentDialogues}

플레이어를 제외한 나머지 NPC 캐릭터(${npcs.map(c => c.name).join(', ')})들이 누구에게 투표할지 결정해줘.
- 각 캐릭터는 자신을 제외한 살아있는 다른 캐릭터에게 투표해야 합니다.
- 선량한 동료는 대화를 바탕으로 합리적인 의심이 가는 사람에게 투표합니다.
- 오피스 빌런(${villain?.name})은 자신에게 쏠린 의심을 피하기 위해 다른 사람에게 투표하거나, 동료들 사이를 이간질하는 투표를 합니다.
- 투표 이유를 간략하게 포함해줘.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            voter: { type: Type.STRING, description: '투표하는 NPC의 이름' },
                            votee: { type: Type.STRING, description: '투표받는 사람의 이름' },
                            reason: { type: Type.STRING, description: '투표하는 이유(15자 내외)' },
                        },
                        required: ["voter", "votee", "reason"],
                    },
                },
            },
        });
        const votes = JSON.parse(response.text);
        // Validate votes
        return votes.filter((vote: any) => 
            npcs.some(npc => npc.name === vote.voter) &&
            aliveCharacters.some(c => c.name === vote.votee) &&
            vote.voter !== vote.votee
        );

    } catch(error) {
        console.error("Error generating NPC votes:", error);
        // Fallback logic
        const fallbackVotes: {voter: string, votee: string, reason: string}[] = [];
        const potentialTargets = aliveCharacters.filter(c => c.name !== playerVote.votee);

        npcs.forEach(npc => {
            let target;
            if (npc.role === Role.VILLAIN) {
                const colleagues = potentialTargets.filter(c => c.role === Role.COLLEAGUE && c.name !== npc.name);
                target = colleagues.length > 0 ? colleagues[Math.floor(Math.random() * colleagues.length)] : potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
            } else {
                const targets = potentialTargets.filter(c => c.name !== npc.name);
                target = targets[Math.floor(Math.random() * targets.length)];
            }
            if (target) {
                fallbackVotes.push({
                    voter: npc.name,
                    votee: target.name,
                    reason: "왠지 의심스러워서요."
                });
            }
        });
        return fallbackVotes;
    }
}