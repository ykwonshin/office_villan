
import React, { useEffect, useRef } from 'react';
import type { Dialogue } from '../types';

interface DialogueLogProps {
  logs: Dialogue[];
}

const DialogueLog: React.FC<DialogueLogProps> = ({ logs }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getMessageStyle = (speaker: string) => {
    if (speaker === 'system') {
      return 'bg-yellow-800 bg-opacity-50 text-yellow-200 italic p-3 rounded-lg my-2 text-center';
    }
    return 'bg-gray-700 p-3 rounded-lg my-2';
  };

  return (
    <div className="h-full bg-gray-900 bg-opacity-70 p-4 rounded-lg overflow-y-auto">
      {logs.map((log, index) => (
        <div key={index} className={getMessageStyle(log.speaker)}>
          {log.speaker !== 'system' && <span className="font-bold text-blue-300">{log.speaker}: </span>}
          <span>{log.message}</span>
        </div>
      ))}
      <div ref={endOfMessagesRef} />
    </div>
  );
};

export default DialogueLog;
