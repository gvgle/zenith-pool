
import { Vector, Ball, Pocket } from '../types';
import { TABLE_WIDTH, TABLE_HEIGHT, BALL_RADIUS, FRICTION, MIN_VELOCITY, WALL_BOUNCE } from '../constants';

export const getDistance = (v1: Vector, v2: Vector) => {
  return Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2));
};

export const updateBallMovement = (ball: Ball) => {
  if (ball.inPocket) return 0;

  let wallImpulse = 0;

  // 更新位置
  ball.position.x += ball.velocity.x;
  ball.position.y += ball.velocity.y;

  // 严格执行横向滚动：旋转仅受 X 轴位移影响
  // 这里的 rotation.x 代表球体绕其垂直中心轴旋转的弧度
  const rollFactor = 0.25; 
  ball.rotation.x = (ball.rotation.x + ball.velocity.x * rollFactor) % (Math.PI * 2);
  // 垂直方向旋转锁定为0
  ball.rotation.y = 0;

  ball.velocity.x *= FRICTION;
  ball.velocity.y *= FRICTION;

  if (Math.abs(ball.velocity.x) < MIN_VELOCITY) ball.velocity.x = 0;
  if (Math.abs(ball.velocity.y) < MIN_VELOCITY) ball.velocity.y = 0;

  // 壁面碰撞
  if (ball.position.x - ball.radius < 0) {
    wallImpulse = Math.abs(ball.velocity.x);
    ball.position.x = ball.radius;
    ball.velocity.x *= -WALL_BOUNCE;
  } else if (ball.position.x + ball.radius > TABLE_WIDTH) {
    wallImpulse = Math.abs(ball.velocity.x);
    ball.position.x = TABLE_WIDTH - ball.radius;
    ball.velocity.x *= -WALL_BOUNCE;
  }

  if (ball.position.y - ball.radius < 0) {
    wallImpulse = Math.max(wallImpulse, Math.abs(ball.velocity.y));
    ball.position.y = ball.radius;
    ball.velocity.y *= -WALL_BOUNCE;
  } else if (ball.position.y + ball.radius > TABLE_HEIGHT) {
    wallImpulse = Math.max(wallImpulse, Math.abs(ball.velocity.y));
    ball.position.y = TABLE_HEIGHT - ball.radius;
    ball.velocity.y *= -WALL_BOUNCE;
  }
  
  return wallImpulse;
};

export const resolveBallCollision = (b1: Ball, b2: Ball): number => {
  if (b1.inPocket || b2.inPocket) return 0;

  const dist = getDistance(b1.position, b2.position);
  if (dist < b1.radius + b2.radius) {
    const nx = (b2.position.x - b1.position.x) / (dist || 1);
    const ny = (b2.position.y - b1.position.y) / (dist || 1);

    const overlap = b1.radius + b2.radius - dist;
    b1.position.x -= nx * overlap / 2;
    b1.position.y -= ny * overlap / 2;
    b2.position.x += nx * overlap / 2;
    b2.position.y += ny * overlap / 2;

    const v1n = b1.velocity.x * nx + b1.velocity.y * ny;
    const v2n = b2.velocity.x * nx + b2.velocity.y * ny;

    const impulse = v1n - v2n;
    
    if (impulse > 0) {
      b1.velocity.x -= impulse * nx;
      b1.velocity.y -= impulse * ny;
      b2.velocity.x += impulse * nx;
      b2.velocity.y += impulse * ny;
      return Math.abs(impulse);
    }
  }
  return 0;
};

export const checkPocket = (ball: Ball, pockets: Pocket[]) => {
  if (ball.inPocket) return false;
  for (const pocket of pockets) {
    if (getDistance(ball.position, pocket.position) < pocket.radius) {
      ball.inPocket = true;
      ball.velocity = { x: 0, y: 0 };
      return true;
    }
  }
  return false;
};
