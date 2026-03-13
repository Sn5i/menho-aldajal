import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';

const socket = io('https://menho-aldajal-backend.onrender.com');

export default function PlayerScreen() {
  const { roomCode } = useParams();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [manualCode, setManualCode] = useState(roomCode || '');
  
  const [playerState, setPlayerState] = useState('joining'); 
  const [roleData, setRoleData] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [votingList, setVotingList] = useState([]);
  const [guessOptions, setGuessOptions] = useState([]);

  useEffect(() => {
    socket.on('joinedSuccessfully', () => setPlayerState('lobby'));
    socket.on('error', (msg) => setError(msg));
    
    socket.on('roleAssigned', (data) => { 
      setRoleData(data); setIsReady(false); setPlayerState('role');
    });

    socket.on('showVotingScreen', (players) => { setVotingList(players); setPlayerState('voting'); });
    socket.on('imposterGuessPhase', (options) => { setGuessOptions(options); setPlayerState('guessing'); });
    socket.on('waitingForGuess', () => setPlayerState('waiting'));
    socket.on('gameOver', () => setPlayerState('gameover'));
    socket.on('backToLobby', () => setPlayerState('lobby'));
    
    // NEW: Kicked from room
    socket.on('kicked', () => {
      alert("تم طردك من الغرفة بسبب انقطاع الاتصال أو من قبل الهوست.");
      window.location.reload(); // Hard reset the phone state!
    });

    return () => { socket.off('joinedSuccessfully'); socket.off('error'); socket.off('roleAssigned'); socket.off('showVotingScreen'); socket.off('imposterGuessPhase'); socket.off('waitingForGuess'); socket.off('gameOver'); socket.off('backToLobby'); socket.off('kicked'); };
  }, []);

  const handleJoin = (e) => { e.preventDefault(); if (name.trim() && manualCode.trim()) socket.emit('joinRoom', { roomCode: manualCode.toUpperCase(), playerName: name }); };
  const handleReadyToVote = () => { socket.emit('playerReadyToVote', manualCode.toUpperCase()); setIsReady(true); };
  const handleVote = (targetId) => { socket.emit('submitVote', { roomCode: manualCode.toUpperCase(), votedForId: targetId }); setPlayerState('waiting'); };
  const handleImposterGuess = (word) => { socket.emit('submitImposterGuess', { roomCode: manualCode.toUpperCase(), guess: word }); setPlayerState('waiting'); };

  // 🌟 BEAUTIFIED GAME OVER SCREEN (Phone) 🌟
  if (playerState === 'gameover') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-saudi-bg text-saudi-text">
        <div className="bg-saudi-card p-10 rounded-[3rem] shadow-xl border-t-8 border-saudi-primary w-full max-w-md text-center">
          <div className="text-[6rem] mb-6">🏁</div>
          <h2 className="text-4xl font-black text-saudi-text mb-4">انتهت الجولة!</h2>
          <p className="text-2xl text-gray-500 font-bold">شوف الشاشة عشان تعرف النتيجة...</p>
          <div className="mt-12 p-6 bg-saudi-bg rounded-2xl border-2 border-dashed border-saudi-accent/50 text-gray-400 font-bold">
            ننتظر الهوست يبدأ قيم جديد ⏳
          </div>
        </div>
      </div>
    );
  }

  // 🌟 BEAUTIFIED WAITING SCREEN (Phone) 🌟
  if (playerState === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-saudi-bg text-saudi-text">
        <div className="bg-saudi-card p-12 rounded-[3rem] shadow-xl border-t-8 border-saudi-accent w-full max-w-md text-center">
          <div className="text-[7rem] mb-8 animate-bounce">👀</div>
          <p className="text-3xl font-black text-saudi-primary leading-relaxed">ركز مع الشاشة الكبيرة...</p>
        </div>
      </div>
    );
  }

  // 🌟 BEAUTIFIED IMPOSTER GUESSING SCREEN (Phone) 🌟
  if (playerState === 'guessing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-red-50 text-saudi-text">
        <div className="bg-white p-8 rounded-[3rem] shadow-xl border-t-8 border-red-500 w-full max-w-md text-center">
          <div className="text-[5rem] mb-2">🏃‍♂️💨</div>
          <h2 className="text-4xl font-black text-red-600 mb-4">صادوك!</h2>
          <p className="mb-8 text-xl text-gray-600 font-bold">عندك فرصة أخيرة تسرق الفوز، وش كانت الكلمة؟</p>
          <div className="grid grid-cols-2 gap-4">
            {guessOptions.map((word, i) => (
              <button key={i} onClick={() => handleImposterGuess(word)} className="bg-red-50 border-4 border-red-100 text-2xl font-black py-8 rounded-2xl hover:bg-red-500 hover:text-white hover:border-red-600 active:scale-95 transition-all shadow-sm">
                {word}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 🌟 BEAUTIFIED VOTING PHASE (Phone) 🌟
  if (playerState === 'voting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-saudi-bg text-saudi-text">
        <div className="bg-saudi-card p-8 rounded-[3rem] shadow-xl border-t-8 border-saudi-danger w-full max-w-md text-center">
          <h2 className="text-4xl font-black text-saudi-danger mb-8">صوّت للدجال! 👇</h2>
          <div className="flex flex-col gap-4">
            {votingList.filter(p => p.name !== name).map(player => (
              <button key={player.id} onClick={() => handleVote(player.id)} className="w-full bg-saudi-bg border-4 border-saudi-accent/30 text-3xl font-black py-6 rounded-2xl hover:bg-saudi-danger hover:text-white hover:border-saudi-danger active:scale-95 transition-all shadow-sm">
                {player.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 🌟 BEAUTIFIED ROLE / SECRET WORD SCREEN (Phone) 🌟
  if (playerState === 'role' && roleData) {
    const isImposter = roleData.role === 'imposter';
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen p-6 transition-colors duration-500 ${isImposter ? 'bg-red-50' : 'bg-saudi-bg'}`}>
        <div className={`p-10 rounded-[3rem] shadow-xl border-t-8 w-full max-w-md text-center flex flex-col items-center min-h-[70vh] ${isImposter ? 'bg-white border-red-500' : 'bg-white border-saudi-primary'}`}>
          <div className="mb-6 bg-gray-100 px-6 py-2 rounded-full border-2 border-gray-200">
            <h2 className="text-xl font-bold text-gray-500">التصنيف: <span className="text-black">{roleData.category}</span></h2>
          </div>
          <div className={`w-full flex-1 flex items-center justify-center rounded-[2rem] border-4 p-6 mb-8 shadow-inner ${isImposter ? 'bg-red-50 border-red-200' : 'bg-saudi-bg border-saudi-accent/30'}`}>
            <span className={`text-[4rem] leading-tight font-black ${isImposter ? 'text-red-600' : 'text-saudi-primary'}`}>{roleData.word}</span>
          </div>
          <p className="text-2xl text-gray-500 font-bold mb-8">{isImposter ? 'حاول تعرف الكلمة من أسئلتهم! 🤫' : 'لا تخلي الدجال يعرف الكلمة! 🤐'}</p>
          <button onClick={handleReadyToVote} disabled={isReady} className={`w-full text-white text-3xl font-black h-24 rounded-2xl transition-all shadow-lg mt-auto ${isReady ? 'bg-gray-300 border-b-4 border-gray-400 cursor-not-allowed scale-95' : 'bg-saudi-danger border-b-8 border-red-800 hover:scale-[1.02] active:scale-95 active:border-b-0 active:translate-y-2'}`}>
            {isReady ? '✅ أنت جاهز' : 'جاهز للتصويت!'}
          </button>
        </div>
      </div>
    );
  }

  // 🌟 BEAUTIFIED WAITING LOBBY SCREEN (Phone) 🌟
  if (playerState === 'lobby') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-saudi-bg text-saudi-text">
        <div className="bg-saudi-card p-10 rounded-[3rem] shadow-xl border-t-8 border-saudi-primary w-full max-w-md text-center flex flex-col items-center">
          <div className="w-28 h-28 bg-saudi-bg rounded-full flex items-center justify-center text-6xl mb-6 shadow-inner border-4 border-saudi-accent/30">👋</div>
          <h2 className="text-4xl font-black text-saudi-primary mb-4">أهلاً بك يا {name}!</h2>
          <div className="w-16 h-1 bg-saudi-accent rounded-full mb-8"></div>
          <p className="text-2xl text-gray-500 font-bold animate-pulse">انتظر الهوست يبدأ اللعبة...</p>
        </div>
      </div>
    );
  }

  // 🌟 BEAUTIFIED JOIN SCREEN (Phone) 🌟
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-saudi-bg text-saudi-text">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-black text-saudi-primary mb-2 drop-shadow-sm">منهو الدجال ؟</h1>
        <p className="text-xl text-saudi-accent font-bold">لعبة الشك والتصريف!</p>
      </div>
      <form onSubmit={handleJoin} className="bg-saudi-card p-8 rounded-[3rem] shadow-xl border-t-8 border-saudi-accent w-full max-w-md flex flex-col gap-8">
        {error && <div className="bg-red-50 border-2 border-red-500 text-red-700 text-xl font-bold p-4 rounded-xl text-center">{error}</div>}
        <div className="flex flex-col items-center">
          <label className="text-2xl font-bold mb-4 text-saudi-text">كود الغرفة:</label>
          <input type="text" value={manualCode} onChange={(e) => setManualCode(e.target.value.toUpperCase())} maxLength={4} className="w-full h-20 text-center text-5xl tracking-[0.3em] font-black bg-saudi-bg border-4 border-gray-200 rounded-2xl outline-none focus:border-saudi-primary uppercase" required />
        </div>
        <div className="flex flex-col items-center">
          <label className="text-2xl font-bold mb-4 text-saudi-text">اسمك:</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-20 text-center text-3xl font-bold bg-saudi-bg border-4 border-gray-200 rounded-2xl outline-none focus:border-saudi-primary" placeholder="اكتب اسمك هنا..." required />
        </div>
        <button type="submit" className="w-full bg-saudi-primary text-white text-3xl font-black h-20 rounded-2xl hover:bg-opacity-90 hover:scale-[1.02] active:scale-95 shadow-lg mt-4 border-b-8 border-[#1A3A2A]">ادخل اللعبة</button>
      </form>
    </div>
  );
}