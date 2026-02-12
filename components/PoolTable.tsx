
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Ball, Pocket, GameMode, GameStatus, GameState } from '../types';
import { TABLE_WIDTH, TABLE_HEIGHT, BALL_RADIUS, POCKET_RADIUS, BALL_COLORS, MIN_VELOCITY } from '../constants';
import { updateBallMovement, resolveBallCollision, checkPocket } from '../engine/physics';
import { calculateAIShot } from '../engine/ai';
import { playCollisionSound, playPocketSound, initAudio } from '../engine/audio';

interface PoolTableProps {
  mode: GameMode;
  onGameOver: (winner: number) => void;
  onScoreUpdate: (scores: [number, number]) => void;
  onTurnChange: (player: number) => void;
}

const PoolTable: React.FC<PoolTableProps> = ({ mode, onGameOver, onScoreUpdate, onTurnChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const aiActionRef = useRef<boolean>(false); 

  const [gameState, setGameState] = useState<GameState>(() => {
    const balls: Ball[] = [];
    const startX = TABLE_WIDTH * 0.5;
    const startY = TABLE_HEIGHT * 0.25; 
    
    let ballId = 1;
    for (let row = 0; row < 5; row++) {
      const ballsInRow = row + 1;
      for (let col = 0; col < ballsInRow; col++) {
        const x = startX - (row * BALL_RADIUS) + (col * BALL_RADIUS * 2);
        const y = startY + (4 - row) * (BALL_RADIUS * 2 * 0.9);

        balls.push({
          id: ballId,
          number: ballId === 5 ? 8 : ballId, 
          position: { x, y },
          velocity: { x: 0, y: 0 },
          rotation: { x: 0, y: 0 }, 
          radius: BALL_RADIUS,
          color: BALL_COLORS[ballId % BALL_COLORS.length],
          isStriped: ballId > 8,
          inPocket: false
        });
        ballId++;
      }
    }

    return {
      balls,
      cueBall: {
        id: 0,
        number: 0,
        position: { x: TABLE_WIDTH * 0.5, y: TABLE_HEIGHT * 0.75 },
        velocity: { x: 0, y: 0 },
        rotation: { x: 0, y: 0 },
        radius: BALL_RADIUS,
        color: '#ffffff',
        isStriped: false,
        inPocket: false
      },
      currentPlayer: 0,
      status: GameStatus.PLAYING,
      mode,
      scores: [0, 0],
      isMoving: false,
      pottedThisShot: false,
      winner: null
    };
  });

  const [aiming, setAiming] = useState<{ angle: number; power: number; rawX: number; rawY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const requestRef = useRef<number>(0);

  const pockets: Pocket[] = [
    { position: { x: 5, y: 5 }, radius: POCKET_RADIUS }, 
    { position: { x: TABLE_WIDTH - 5, y: 5 }, radius: POCKET_RADIUS }, 
    { position: { x: -8, y: TABLE_HEIGHT / 2 }, radius: POCKET_RADIUS + 2 }, 
    { position: { x: TABLE_WIDTH + 8, y: TABLE_HEIGHT / 2 }, radius: POCKET_RADIUS + 2 }, 
    { position: { x: 5, y: TABLE_HEIGHT - 5 }, radius: POCKET_RADIUS }, 
    { position: { x: TABLE_WIDTH - 5, y: TABLE_HEIGHT - 5 }, radius: POCKET_RADIUS }, 
  ];

  const handleShoot = useCallback((angle: number, power: number) => {
    setGameState(prev => ({
      ...prev,
      cueBall: {
        ...prev.cueBall,
        velocity: {
          x: Math.cos(angle) * power,
          y: Math.sin(angle) * power
        }
      },
      isMoving: true,
      pottedThisShot: false
    }));
    setAiming(null);
    aiActionRef.current = false; 
  }, []);

  const update = useCallback(() => {
    setGameState(prev => {
      if (prev.winner !== null) return prev;
      
      const nextCueBall = { ...prev.cueBall };
      const nextBalls = prev.balls.map(b => ({ ...b }));
      let nextPottedThisShot = prev.pottedThisShot;
      
      let anyMoving = false;
      if (!nextCueBall.inPocket) {
        const wallImpulse = updateBallMovement(nextCueBall);
        if (wallImpulse > 0.5) playCollisionSound(wallImpulse);
        if (Math.abs(nextCueBall.velocity.x) >= MIN_VELOCITY || Math.abs(nextCueBall.velocity.y) >= MIN_VELOCITY) anyMoving = true;
      }
      
      nextBalls.forEach(b => {
        const wallImpulse = updateBallMovement(b);
        if (wallImpulse > 0.5) playCollisionSound(wallImpulse);
        if (Math.abs(b.velocity.x) >= MIN_VELOCITY || Math.abs(b.velocity.y) >= MIN_VELOCITY) anyMoving = true;
      });

      for (let i = 0; i < nextBalls.length; i++) {
        const cueImpulse = resolveBallCollision(nextCueBall, nextBalls[i]);
        if (cueImpulse > 0.2) playCollisionSound(cueImpulse);
        for (let j = i + 1; j < nextBalls.length; j++) {
          const ballImpulse = resolveBallCollision(nextBalls[i], nextBalls[j]);
          if (ballImpulse > 0.2) playCollisionSound(ballImpulse);
        }
      }

      if (checkPocket(nextCueBall, pockets)) {
        playPocketSound();
        nextCueBall.inPocket = false;
        nextCueBall.position = { x: TABLE_WIDTH * 0.5, y: TABLE_HEIGHT * 0.75 };
        nextCueBall.velocity = { x: 0, y: 0 };
        anyMoving = false; 
      }

      const nextScores = [...prev.scores] as [number, number];
      nextBalls.forEach(b => {
        if (!b.inPocket && checkPocket(b, pockets)) {
          playPocketSound();
          nextPottedThisShot = true;
          nextScores[prev.currentPlayer]++;
        }
      });

      let nextPlayer = prev.currentPlayer;
      let turnDone = false;
      
      if (prev.isMoving && !anyMoving) {
        turnDone = true;
        if (!nextPottedThisShot) {
          nextPlayer = (prev.currentPlayer + 1) % 2;
        }
      }

      const eightBall = nextBalls.find(b => b.number === 8);
      let winner = prev.winner;
      if (eightBall?.inPocket) {
        winner = prev.currentPlayer;
        onGameOver(winner);
      }

      if (turnDone) {
        onScoreUpdate(nextScores);
        onTurnChange(nextPlayer);
      }

      return {
        ...prev,
        cueBall: nextCueBall,
        balls: nextBalls,
        isMoving: anyMoving,
        pottedThisShot: nextPottedThisShot,
        currentPlayer: nextPlayer,
        scores: nextScores,
        winner
      };
    });

    requestRef.current = requestAnimationFrame(update);
  }, [onGameOver, onScoreUpdate, onTurnChange]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current);
  }, [update]);

  useEffect(() => {
    const isAITurn = 
      (gameState.mode === GameMode.PvE && gameState.currentPlayer === 1) ||
      (gameState.mode === GameMode.EvE);

    if (isAITurn && !gameState.isMoving && gameState.winner === null && !aiActionRef.current) {
      aiActionRef.current = true; 
      const timer = setTimeout(() => {
        const shot = calculateAIShot(gameState.cueBall, gameState.balls, pockets);
        if (shot) handleShoot(shot.angle, shot.power);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [gameState.isMoving, gameState.currentPlayer, gameState.mode, gameState.winner, handleShoot]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

    // 绘制球洞
    pockets.forEach(p => {
      ctx.save();
      const grad = ctx.createRadialGradient(p.position.x, p.position.y, p.radius * 0.4, p.position.x, p.position.y, p.radius);
      grad.addColorStop(0, '#020617');
      grad.addColorStop(0.9, '#1e293b');
      grad.addColorStop(1, '#0f172a');
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    });

    const drawBall = (ball: Ball) => {
      if (ball.inPocket) return;
      ctx.save();
      ctx.translate(ball.position.x, ball.position.y);

      // 投影阴影
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowOffsetY = 6;

      // 1. 球体底色
      ctx.beginPath();
      ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = ball.color;
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // 旋转弧度 (rotation.x 代表绕 Y 轴的水平旋转)
      const angle = ball.rotation.x;

      // 花色球色带逻辑 (根据旋转角度偏移)
      if (ball.isStriped) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,1)';
        
        // 色带背景，模拟圆柱体表面滚动
        const stripeWidth = ball.radius * 0.9;
        // 增加一点透视偏移
        const offsetX = Math.sin(angle) * ball.radius * 0.3;
        ctx.fillRect(-ball.radius + offsetX, -stripeWidth / 2, ball.radius * 2, stripeWidth);
        ctx.restore();
      }

      // 2. 极致数字渲染 (数字始终在“上面”中心，但跟随球体水平旋转)
      if (ball.number > 0) {
        ctx.save();
        // 数字背景白底，固定在中心
        ctx.beginPath();
        ctx.arc(0, 0, ball.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.shadowBlur = 3;
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // 关键：数字跟随球体旋转
        ctx.rotate(angle);
        
        ctx.fillStyle = 'black';
        ctx.font = `900 ${ball.radius * 1.1}px Inter, Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ball.number.toString(), 0, 0);
        ctx.restore();
      }

      // 3. 高光层 (覆盖在数字之上)
      const highlight = ctx.createRadialGradient(-ball.radius * 0.4, -ball.radius * 0.4, 1, 0, 0, ball.radius);
      highlight.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
      highlight.addColorStop(0.3, 'rgba(255, 255, 255, 0.15)');
      highlight.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
      ctx.fillStyle = highlight;
      ctx.beginPath();
      ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    gameState.balls.forEach(drawBall);
    drawBall(gameState.cueBall);

    if (aiming && !gameState.isMoving) {
      const { angle, power } = aiming;
      const cueColor = gameState.currentPlayer === 0 ? '#10b981' : '#6366f1';
      
      ctx.save();
      ctx.translate(gameState.cueBall.position.x, gameState.cueBall.position.y);
      ctx.rotate(angle + Math.PI);
      const pullBack = 22 + power * 6;
      const cueLength = 380;
      const cueGrad = ctx.createLinearGradient(pullBack, -4, pullBack + cueLength, 4);
      cueGrad.addColorStop(0, '#ffffff'); 
      cueGrad.addColorStop(0.1, cueColor); 
      cueGrad.addColorStop(0.8, '#0f172a'); 
      ctx.beginPath();
      ctx.moveTo(pullBack, -4);
      ctx.lineTo(pullBack + cueLength, -9);
      ctx.lineTo(pullBack + cueLength, 9);
      ctx.lineTo(pullBack, 4);
      ctx.closePath();
      ctx.fillStyle = cueGrad;
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.setLineDash([10, 15]);
      ctx.moveTo(gameState.cueBall.position.x, gameState.cueBall.position.y);
      ctx.lineTo(
        gameState.cueBall.position.x + Math.cos(angle) * 140,
        gameState.cueBall.position.y + Math.sin(angle) * 140
      );
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [gameState, aiming]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (TABLE_WIDTH / rect.width),
      y: (clientY - rect.top) * (TABLE_HEIGHT / rect.height)
    };
  };

  const onMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    initAudio();
    if (gameState.isMoving || gameState.winner !== null || aiActionRef.current) return;
    const isHumanTurn = (gameState.mode === GameMode.PvP) || (gameState.mode === GameMode.PvE && gameState.currentPlayer === 0);
    if (!isHumanTurn) return;

    setIsDragging(true);
    const pos = getCanvasPos(e);
    const dx = pos.x - gameState.cueBall.position.x;
    const dy = pos.y - gameState.cueBall.position.y;
    setAiming({ angle: Math.atan2(dy, dx), power: 0, rawX: pos.x, rawY: pos.y });
  };

  const onMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const pos = getCanvasPos(e);
    const dx = pos.x - gameState.cueBall.position.x;
    const dy = pos.y - gameState.cueBall.position.y;
    const shotAngle = Math.atan2(-dy, -dx);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const power = Math.min(distance / 6.5, 28); 
    setAiming({ angle: shotAngle, power, rawX: pos.x, rawY: pos.y });
  };

  const onMouseUp = () => {
    if (isDragging && aiming) {
      if (aiming.power > 0.5) {
        handleShoot(aiming.angle, aiming.power);
      } else {
        setAiming(null);
      }
    }
    setIsDragging(false);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div 
        className="relative bg-[#064e3b] rounded-[3rem] shadow-[0_80px_200px_rgba(0,0,0,0.95)] border-[18px] sm:border-[28px] border-slate-900 overflow-hidden cursor-crosshair touch-none"
        style={{ height: '98%', maxHeight: '760px', aspectRatio: '1/2' }}
      >
        <canvas
          ref={canvasRef}
          width={TABLE_WIDTH}
          height={TABLE_HEIGHT}
          className="w-full h-full block"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onMouseDown}
          onTouchMove={onMouseMove}
          onTouchEnd={onMouseUp}
        />
        <div className="absolute inset-0 pointer-events-none opacity-25 bg-[url('https://www.transparenttextures.com/patterns/felt.png')]"></div>
        <div className="absolute inset-0 pointer-events-none opacity-60 bg-[radial-gradient(circle_at_center,transparent_0%,#000_100%)]"></div>
      </div>
    </div>
  );
};

export default PoolTable;
