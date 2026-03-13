const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const rooms = {};

const gameDictionary = {
  "أكلات شعبية": ["كبسة", "جريش", "مرقوق", "سليق", "مندي", "مطازيز", "حنيذ", "مثلوثة", "مقلوبة", "هريس", "عصيدة", "مصابيب"],
  "مدن سعودية": ["الرياض", "جدة", "الدمام", "أبها", "نيوم", "العلا", "مكة", "المدينة", "الطائف", "تبوك", "حائل", "جازان", "نجران", "القصيم"],
  "ماركات سيارات": ["تويوتا", "فورد", "هيونداي", "مرسيدس", "لكزس", "نيسان", "شيفروليه", "بي إم دبليو", "أودي", "كيا", "هوندا", "جي إم سي", "مازدا"],
  "أندية سعودية": ["الهلال", "النصر", "الاتحاد", "الأهلي", "الشباب", "التعاون", "الاتفاق", "الفتح", "الرائد", "الفيحاء"],
  "أماكن سياحية": ["البجيري", "بوليفارد", "حافة العالم", "درة العروس", "جبال السودة", "قرية ذي عين", "واجهة جدة", "كورنيش الخبر"],
  "حيوانات وطيور": ["صقر", "جمل", "حصان", "غزال", "ذئب", "ضب", "فهد", "نمر", "عقاب", "حمامة", "نعامة", "صقر شاهين"],
  "مهن ووظائف": ["طبيب", "مهندس", "طيار", "معلم", "ضابط", "محامي", "مبرمج", "محاسب", "طباخ", "مصور", "مسعف"],
  "أشياء في المجلس": ["دلة", "فنجال", "مبخرة", "تمر", "تكاية", "زل", "تلفزيون", "بلايستيشن", "مكيف", "ريموت", "سبحة"]
};

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

io.on('connection', (socket) => {
  console.log('🟢 User connected:', socket.id);

  socket.on('createRoom', () => {
    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    rooms[roomCode] = { hostId: socket.id, players: [], gameState: 'lobby', secretWord: '', imposterId: '', category: '', questionPairs: [], currentPairIndex: 0, readyToVoteCount: 0, votes: {} };
    socket.join(roomCode);
    socket.emit('roomCreated', roomCode);
  });

  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const room = rooms[roomCode];
    if (room && room.gameState === 'lobby') {
      room.players.push({ id: socket.id, name: playerName, score: 0, role: '', isReadyToVote: false });
      socket.join(roomCode);
      io.to(room.hostId).emit('playerJoined', room.players); 
      socket.emit('joinedSuccessfully');
    } else {
      socket.emit('error', 'الغرفة غير موجودة أو اللعبة بدأت');
    }
  });

  socket.on('kickPlayer', ({ roomCode, playerId }) => {
    const room = rooms[roomCode];
    if (room && room.hostId === socket.id) {
      room.players = room.players.filter(p => p.id !== playerId);
      io.to(room.hostId).emit('playerJoined', room.players); 
      io.to(playerId).emit('kicked'); 
    }
  });

  socket.on('startGame', (roomCode) => {
    const room = rooms[roomCode];
    if (room && room.hostId === socket.id && room.players.length >= 1) { 
      room.gameState = 'questioning';
      room.votes = {}; room.readyToVoteCount = 0; room.players.forEach(p => p.isReadyToVote = false);

      const categories = Object.keys(gameDictionary);
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      const wordsList = gameDictionary[randomCategory];
      const secretWord = wordsList[Math.floor(Math.random() * wordsList.length)];

      room.category = randomCategory; room.secretWord = secretWord; room.wordList = wordsList;
      room.imposterId = room.players[Math.floor(Math.random() * room.players.length)].id;

      const shuffledPlayers = shuffleArray([...room.players]);
      room.questionPairs = shuffledPlayers.map((player, index) => {
        const target = index === shuffledPlayers.length - 1 ? shuffledPlayers[0] : shuffledPlayers[index + 1];
        return { asker: player.name, target: target.name };
      });

      io.to(room.hostId).emit('questioningPhase', { pair: room.questionPairs[0], readyCount: 0 });

      room.players.forEach(player => {
        const roleData = player.id === room.imposterId 
          ? { role: 'imposter', word: 'أنت الدجال!', category: randomCategory }
          : { role: 'villager', word: secretWord, category: randomCategory };
        io.to(player.id).emit('roleAssigned', roleData);
      });
    }
  });

  socket.on('nextTurn', (roomCode) => {
    const room = rooms[roomCode];
    if (room && room.hostId === socket.id && ++room.currentPairIndex < room.questionPairs.length) {
      io.to(room.hostId).emit('questioningPhase', { pair: room.questionPairs[room.currentPairIndex], readyCount: room.readyToVoteCount });
    }
  });

  socket.on('playerReadyToVote', (roomCode) => {
    const room = rooms[roomCode];
    if (room && room.gameState === 'questioning') {
      const player = room.players.find(p => p.id === socket.id);
      if (player && !player.isReadyToVote) {
        player.isReadyToVote = true; room.readyToVoteCount++;
        io.to(room.hostId).emit('updateReadyCount', room.readyToVoteCount);
      }
    }
  });

  socket.on('startVoting', (roomCode) => {
    const room = rooms[roomCode];
    if (room && room.hostId === socket.id) {
      room.gameState = 'voting';
      io.to(room.hostId).emit('votingStarted');
      const safePlayerList = room.players.map(p => ({ id: p.id, name: p.name }));
      room.players.forEach(player => io.to(player.id).emit('showVotingScreen', safePlayerList));
    }
  });

  socket.on('submitVote', ({ roomCode, votedForId }) => {
    const room = rooms[roomCode];
    if (room && room.gameState === 'voting') {
      room.votes[socket.id] = votedForId;
      io.to(room.hostId).emit('playerVoted', socket.id);
      
      if (Object.keys(room.votes).length === room.players.length) {
        const voteCounts = {};
        Object.values(room.votes).forEach(id => voteCounts[id] = (voteCounts[id] || 0) + 1);
        
        let maxVotes = 0; let votedOutId = null;
        for (const [id, count] of Object.entries(voteCounts)) {
          if (count > maxVotes) { maxVotes = count; votedOutId = id; }
        }

        const imposter = room.players.find(p => p.id === room.imposterId);
        const votedOutPlayer = room.players.find(p => p.id === votedOutId);
        const isImposterCaught = votedOutId === room.imposterId;
        room.gameState = 'results';

        if (isImposterCaught) {
          io.to(room.hostId).emit('votingResults', { caught: true, imposterName: imposter.name, secretWord: room.secretWord });
          let wrongWords = shuffleArray(room.wordList.filter(w => w !== room.secretWord)).slice(0, 5);
          let options = shuffleArray([room.secretWord, ...wrongWords]);
          io.to(imposter.id).emit('imposterGuessPhase', options);
          room.players.filter(p => p.id !== imposter.id).forEach(p => io.to(p.id).emit('waitingForGuess'));
        } else {
          imposter.score += 2;
          io.to(room.hostId).emit('votingResults', { caught: false, imposterName: imposter.name, votedOutName: votedOutPlayer.name, secretWord: room.secretWord });
          room.players.forEach(p => io.to(p.id).emit('gameOver'));
        }
      }
    }
  });

  socket.on('submitImposterGuess', ({ roomCode, guess }) => {
    const room = rooms[roomCode];
    if (room && room.gameState === 'results') {
      const isCorrect = guess === room.secretWord;
      const imposter = room.players.find(p => p.id === room.imposterId);
      
      if (isCorrect) {
        imposter.score += 2; 
      } else {
        room.players.forEach(p => {
          if (p.id !== room.imposterId) p.score += 1; 
        });
      }

      io.to(room.hostId).emit('finalResult', { isCorrect, guess, imposterName: imposter.name, secretWord: room.secretWord });
      room.players.forEach(p => io.to(p.id).emit('gameOver'));
    }
  });

  socket.on('endGame', (roomCode) => {
    const room = rooms[roomCode];
    if (room && room.hostId === socket.id) {
      room.gameState = 'scoreboard';
      io.to(room.hostId).emit('showScoreboard', room.players);
    }
  });

  socket.on('playAgain', (roomCode) => {
    const room = rooms[roomCode];
    if (room && room.hostId === socket.id) {
      room.gameState = 'lobby';
      io.to(room.hostId).emit('backToLobby', room.players);
      room.players.forEach(p => io.to(p.id).emit('backToLobby'));
    }
  });

  socket.on('disconnect', () => console.log('🔴 User disconnected:', socket.id));
});

// 🌟 THIS IS THE CLOUD-READY UPDATE 🌟
const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 منهو الدجال Backend is running on port ${PORT}`);
});