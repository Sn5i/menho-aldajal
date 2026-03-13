import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { QRCodeCanvas } from 'qrcode.react';

const socket = io(`http://${window.location.hostname}:3001`);

export default function HostScreen() {
  const [roomCode, setRoomCode] = useState(null);
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState('lobby'); 
  const [currentPair, setCurrentPair] = useState(null);
  const [readyCount, setReadyCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [votedPlayers, setVotedPlayers] = useState([]); 
  const [resultData, setResultData] = useState(null);
  const [finalData, setFinalData] = useState(null);

  useEffect(() => {
    socket.emit('createRoom');
    socket.on('roomCreated', (code) => setRoomCode(code));
    socket.on('playerJoined', (newPlayerList) => setPlayers(newPlayerList));

    socket.on('questioningPhase', (data) => {
      setGameState('questioning'); setCurrentPair(data.pair); setReadyCount(data.readyCount); setTimeLeft(60); setVotedPlayers([]); setResultData(null); setFinalData(null);
    });

    socket.on('updateReadyCount', (count) => setReadyCount(count));
    socket.on('votingStarted', () => setGameState('voting'));
    socket.on('playerVoted', (playerId) => setVotedPlayers((prev) => [...prev, playerId]));
    socket.on('votingResults', (data) => { setGameState('results'); setResultData(data); });
    socket.on('finalResult', (data) => setFinalData(data));
    socket.on('backToLobby', (playerList) => { setGameState('lobby'); if(playerList) setPlayers(playerList); });
    
    // NEW: Listen for final scoreboard
    socket.on('showScoreboard', (finalPlayers) => { setGameState('scoreboard'); setPlayers(finalPlayers); });

    return () => { socket.off('roomCreated'); socket.off('playerJoined'); socket.off('questioningPhase'); socket.off('updateReadyCount'); socket.off('votingStarted'); socket.off('playerVoted'); socket.off('votingResults'); socket.off('finalResult'); socket.off('backToLobby'); socket.off('showScoreboard'); };
  }, []);

  useEffect(() => {
    if (gameState === 'questioning' && timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [gameState, timeLeft]);

  const joinUrl = `http://${window.location.hostname}:5173/join/${roomCode}`;

  // 🌟 NEW BEAUTIFIED FINAL SCOREBOARD 🌟
  if (gameState === 'scoreboard') {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-saudi-bg text-saudi-text">
        <h1 className="text-[6rem] font-black text-saudi-primary mb-12 drop-shadow-sm">🏆 لوحة الشرف 🏆</h1>
        <div className="bg-saudi-card p-16 rounded-[4rem] shadow-2xl border-t-[12px] border-saudi-accent w-full max-w-5xl">
          <ul className="flex flex-col gap-6">
            {sortedPlayers.map((player, index) => (
              <li key={player.id} className={`flex justify-between items-center p-8 rounded-3xl border-4 ${index === 0 ? 'bg-yellow-100 border-yellow-400 scale-105 shadow-lg' : 'bg-saudi-bg border-saudi-accent/30'}`}>
                <div className="flex items-center gap-6">
                  <span className="text-5xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👏'}</span>
                  <span className="text-4xl font-black">{player.name}</span>
                </div>
                <div className="text-4xl font-black text-saudi-primary bg-white px-8 py-4 rounded-2xl shadow-sm">
                  {player.score} نقطة
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // 🌟 BEAUTIFIED RESULTS PHASE (TV) 🌟
  if (gameState === 'results' && resultData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-saudi-bg text-saudi-text">
        <div className="bg-saudi-card p-16 rounded-[4rem] shadow-2xl border-t-[12px] w-full max-w-6xl text-center border-saudi-primary flex flex-col items-center">
          
          {!resultData.caught && (
            <>
              <div className="text-[8rem] mb-4">🎭</div>
              <h1 className="text-[6rem] font-black text-saudi-danger mb-4 leading-none">فاز الدجال!</h1>
              <p className="text-3xl text-green-600 font-black mb-8 bg-green-100 px-6 py-2 rounded-full">+2 نقطة للدجال</p>
              <p className="text-4xl text-gray-500 font-bold mb-12">صوتوا لـ <span className="text-saudi-text">{resultData.votedOutName}</span> بالغلط!</p>
              <div className="bg-red-50 border-4 border-red-200 rounded-[3rem] p-10 w-full mb-12">
                <p className="text-5xl font-bold">الدجال الحقيقي كان: <span className="text-saudi-danger">{resultData.imposterName}</span></p>
              </div>
              <div className="text-5xl font-black text-saudi-primary py-8 px-16 bg-saudi-bg rounded-[2rem] border-4 border-saudi-accent/30 shadow-inner">الكلمة: {resultData.secretWord}</div>
            </>
          )}

          {resultData.caught && !finalData && (
            <>
              <div className="text-[8rem] mb-4">🕵️‍♂️</div>
              <h1 className="text-[6rem] font-black text-green-600 mb-8 leading-none">صتدتوه!</h1>
              <div className="bg-green-50 border-4 border-green-200 rounded-[3rem] p-10 w-full mb-12">
                <p className="text-5xl font-bold">الدجال هو: <span className="text-saudi-danger">{resultData.imposterName}</span></p>
              </div>
              <div className="animate-pulse text-4xl font-bold bg-saudi-bg p-12 rounded-[2rem] border-4 border-dashed border-saudi-accent w-full text-saudi-primary">
                الدجال قاعد يحاول يخمن الكلمة من جواله... ⏳
              </div>
            </>
          )}

          {resultData.caught && finalData && (
            <>
              <div className="text-[8rem] mb-4">{finalData.isCorrect ? '😱' : '🎉'}</div>
              <h1 className={`text-[6rem] font-black mb-4 leading-none ${finalData.isCorrect ? 'text-saudi-danger' : 'text-green-600'}`}>
                {finalData.isCorrect ? 'الدجال سرق الفوز!' : 'فازوا القرويين!'}
              </h1>
              
              <p className="text-3xl text-green-600 font-black mb-8 bg-green-100 px-6 py-2 rounded-full">
                {finalData.isCorrect ? '+2 نقطة للدجال' : '+1 نقطة لكل قروي'}
              </p>

              <div className={`border-4 rounded-[3rem] p-10 w-full mb-12 ${finalData.isCorrect ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <p className="text-4xl font-bold">
                  <span className="text-saudi-text">{finalData.imposterName}</span> خمن "{finalData.guess}" وطلعت <span className={finalData.isCorrect ? 'text-saudi-danger' : 'text-green-600'}>{finalData.isCorrect ? 'صح!' : 'غلط!'}</span>
                </p>
              </div>
              <div className="text-5xl font-black text-saudi-primary py-8 px-16 bg-saudi-bg rounded-[2rem] border-4 border-saudi-accent/30 shadow-inner">
                الكلمة الحقيقية: {finalData.secretWord}
              </div>
            </>
          )}

          {/* NEW: End Game & Play Again Buttons */}
          {(!resultData.caught || finalData) && (
            <div className="flex gap-8 mt-16">
              <button onClick={() => socket.emit('playAgain', roomCode)} className="bg-saudi-primary text-white text-4xl font-bold px-12 py-6 rounded-full hover:scale-105 shadow-xl transition-all">
                🔄 العب الجولة الجاية
              </button>
              <button onClick={() => socket.emit('endGame', roomCode)} className="bg-saudi-accent text-white text-4xl font-bold px-12 py-6 rounded-full hover:scale-105 shadow-xl transition-all">
                🏆 إنهاء اللعبة
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 🌟 BEAUTIFIED VOTING PHASE (TV) 🌟
  if (gameState === 'voting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-saudi-bg text-saudi-text">
        <h1 className="text-[6rem] font-black text-saudi-danger mb-6 animate-pulse drop-shadow-sm">وقت التصويت!</h1>
        <p className="text-4xl text-gray-500 font-bold mb-16">شوف جوالك وصوّت للشخص اللي تتوقع انه الدجال</p>
        <div className="bg-saudi-card p-16 rounded-[4rem] shadow-2xl border-t-[12px] border-saudi-danger w-full max-w-6xl">
          <ul className="grid grid-cols-2 lg:grid-cols-3 gap-8">
            {players.map((player) => {
              const hasVoted = votedPlayers.includes(player.id);
              return (
                <li key={player.id} className={`text-4xl font-black py-10 px-8 rounded-[2rem] flex flex-col items-center gap-6 border-4 transition-all ${hasVoted ? 'bg-green-50 border-green-500 text-green-700 shadow-md scale-105' : 'bg-saudi-bg border-saudi-accent/30 text-gray-400'}`}>
                  <span>{player.name}</span><span className="text-3xl">{hasVoted ? '✅ تم التصويت' : '⏳ يفكر...'}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }

  // 🌟 BEAUTIFIED QUESTIONING PHASE (TV) 🌟
  if (gameState === 'questioning') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-saudi-bg text-saudi-text">
        <div className="bg-saudi-card p-16 rounded-[4rem] shadow-2xl border-t-[12px] border-saudi-primary w-full max-w-6xl">
          <div className="flex justify-between items-center mb-16 border-b-4 border-gray-100 pb-12">
            <div className="text-4xl font-black bg-saudi-bg px-10 py-6 rounded-3xl border-4 border-saudi-accent/50 text-gray-600 flex items-center gap-4">
              <span>جاهزين للتصويت:</span><span className="text-saudi-primary text-5xl">{readyCount} / {players.length}</span>
            </div>
            <div className={`text-[6rem] leading-none font-black px-12 py-6 rounded-3xl border-8 ${timeLeft <= 10 ? 'text-saudi-danger border-saudi-danger animate-pulse bg-red-50' : 'text-saudi-primary border-saudi-primary bg-saudi-bg'}`}>
              00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
            </div>
          </div>
          <div className="text-center flex flex-col items-center">
            <h2 className="text-5xl text-gray-400 font-black mb-8">الدور الآن:</h2>
            {currentPair ? (
              <div className="w-full text-[6rem] font-black text-saudi-primary my-8 py-20 bg-saudi-bg rounded-[3rem] border-8 border-dashed border-saudi-accent/50 flex items-center justify-center gap-12 shadow-inner">
                <span className="text-black bg-white px-12 py-4 rounded-2xl shadow-sm">{currentPair.asker}</span>
                <span className="text-6xl text-saudi-accent">يسأل ➔</span>
                <span className="text-black bg-white px-12 py-4 rounded-2xl shadow-sm">{currentPair.target}</span>
              </div>
            ) : (
              <div className="w-full text-[5rem] font-black text-gray-400 my-8 py-20 bg-gray-50 rounded-[3rem] border-8 border-dashed border-gray-200">انتهت الأسئلة!</div>
            )}
          </div>
          <div className="flex justify-center gap-8 mt-16">
            {currentPair && <button onClick={() => socket.emit('nextTurn', roomCode)} className="flex-1 bg-saudi-bg text-saudi-primary border-4 border-saudi-primary text-4xl font-black py-8 rounded-full hover:bg-saudi-primary hover:text-white transition-all">⏭️ السؤال التالي</button>}
            <button onClick={() => socket.emit('startVoting', roomCode)} className="flex-1 bg-saudi-danger text-white text-4xl font-black py-8 rounded-full hover:scale-105 shadow-xl transition-all">🗳️ بدأ التصويت</button>
          </div>
        </div>
      </div>
    );
  }

  // 🌟 BEAUTIFIED LOBBY SCREEN (TV) 🌟
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-saudi-bg text-saudi-text relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-saudi-accent opacity-10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-saudi-primary opacity-5 rounded-full blur-3xl"></div>
      <div className="text-center z-10 mb-16">
        <h1 className="text-[7rem] font-black text-saudi-primary mb-4 drop-shadow-sm tracking-tight">منهو الدجال ؟</h1>
        <p className="text-4xl text-saudi-accent font-bold">امسح الكود عشان تدخل اللعبة وتشاركنا!</p>
      </div>
      <div className="flex flex-col xl:flex-row gap-16 w-full max-w-[90rem] items-stretch justify-center z-10">
        <div className="bg-saudi-card p-12 rounded-[3rem] shadow-2xl border-t-8 border-saudi-primary flex flex-col items-center justify-center flex-1">
          {roomCode ? (
            <>
              <div className="bg-white p-6 rounded-3xl shadow-md border-2 border-gray-100 mb-8 transition-transform hover:scale-105"><QRCodeCanvas value={joinUrl} size={350} level={"H"} fgColor="#2B5A41" /></div>
              <p className="text-3xl font-bold mb-4 text-gray-500">كود الغرفة</p>
              <div className="text-[6rem] leading-none font-black text-saudi-primary tracking-[0.2em] bg-saudi-bg px-16 py-8 rounded-[2rem] border-4 border-saudi-accent/40 shadow-inner">{roomCode}</div>
            </>
          ) : (<div className="animate-pulse text-4xl font-bold text-saudi-accent">جاري إنشاء الغرفة...</div>)}
        </div>
        <div className="bg-saudi-card p-12 rounded-[3rem] shadow-2xl border-t-8 border-saudi-accent flex-1 w-full flex flex-col">
          <div className="flex flex-col items-center mb-10 border-b-4 border-saudi-bg pb-8">
            <h2 className="text-5xl font-black text-saudi-text mb-6">اللاعبين ({players.length}/15)</h2>
            {players.length >= 1 ? (
              <button onClick={() => socket.emit('startGame', roomCode)} className="bg-saudi-primary text-white text-4xl font-bold px-16 py-6 rounded-full hover:bg-opacity-90 hover:scale-105 transition-all shadow-xl">🚀 ابدأ اللعبة</button>
            ) : (<div className="text-2xl text-gray-400 bg-gray-100 px-8 py-4 rounded-full">بانتظار دخول اللاعبين...</div>)}
          </div>
          <div className="flex-1 overflow-y-auto">
            {players.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-3xl font-bold text-center opacity-50">المجلس فاضي، <br/>امسح الكود وادخل!</div>
            ) : (
              <ul className="grid grid-cols-2 gap-6">
                {players.map((p) => (
                  <li key={p.id} className="bg-saudi-bg text-3xl font-bold py-4 px-6 rounded-2xl flex items-center justify-between border-2 border-saudi-accent/20 text-saudi-text shadow-sm group">
                    <div className="flex items-center gap-4">
                      <span>{p.name}</span>
                      <span className="text-xl bg-white px-3 py-1 rounded-full text-saudi-primary border-2 border-saudi-accent/30">{p.score} ⭐️</span>
                    </div>
                    {/* NEW: Kick Button */}
                    <button onClick={() => socket.emit('kickPlayer', {roomCode, playerId: p.id})} className="text-2xl text-red-300 hover:text-red-600 hover:scale-125 transition-all" title="طرد اللاعب">✖</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}