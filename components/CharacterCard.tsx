
import React from 'react';
import type { Character } from '../types';

interface CharacterCardProps {
  character: Character;
  onSelect: (name: string) => void;
  isSelectable: boolean;
  isPlayer: boolean;
}

const CharacterCard: React.FC<CharacterCardProps> = ({ character, onSelect, isSelectable, isPlayer }) => {
  const cardClasses = `
    w-full bg-gray-800 rounded-lg p-4 text-center shadow-lg transition-all duration-300
    ${character.isAlive ? 'border-2 border-gray-700' : 'opacity-40 bg-gray-900'}
    ${isSelectable && character.isAlive ? 'cursor-pointer hover:border-blue-500 hover:scale-105' : ''}
    ${isPlayer ? 'border-green-500' : ''}
  `;

  return (
    <div className={cardClasses} onClick={() => isSelectable && character.isAlive && onSelect(character.name)}>
      <div className="relative">
        <img
          src={character.avatarUrl}
          alt={character.name}
          className={`w-20 h-20 rounded-full mx-auto border-4 ${isPlayer ? 'border-green-400' : 'border-gray-600'} ${!character.isAlive ? 'filter grayscale' : ''}`}
        />
        {!character.isAlive && (
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-red-500 text-2xl font-bold transform -rotate-12 bg-black bg-opacity-50 px-2 rounded">해고됨</span>
            </div>
        )}
      </div>
      <p className="mt-2 text-lg font-bold">{character.name}</p>
      <p className="text-sm text-gray-400">{character.title}</p>
      {isPlayer && <p className="text-xs text-green-400 font-bold mt-1">(YOU)</p>}
    </div>
  );
};

export default CharacterCard;
