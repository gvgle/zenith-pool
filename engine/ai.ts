
import { Ball, Pocket, Vector } from '../types';
import { getDistance } from './physics';

/**
 * 强化版 AI：锁定最近的目标球并以强力击打
 */
export const calculateAIShot = (
  cueBall: Ball, 
  targetBalls: Ball[], 
  pockets: Pocket[], 
  difficulty: number = 0.5
): { angle: number, power: number } | null => {
  // 过滤掉已经进袋的球和母球本身
  const activeBalls = targetBalls.filter(b => !b.inPocket && b.id !== 0);
  
  if (activeBalls.length === 0) return null;

  // 寻找距离母球最近的球
  let nearestBall = activeBalls[0];
  let minDistance = getDistance(cueBall.position, nearestBall.position);

  for (let i = 1; i < activeBalls.length; i++) {
    const dist = getDistance(cueBall.position, activeBalls[i].position);
    if (dist < minDistance) {
      minDistance = dist;
      nearestBall = activeBalls[i];
    }
  }

  // 计算指向最近球中心点的精确角度
  const dx = nearestBall.position.x - cueBall.position.x;
  const dy = nearestBall.position.y - cueBall.position.y;
  const angle = Math.atan2(dy, dx);

  // 大幅提升基础力度，解决用户反馈的“力量太小”问题
  // 基础力度从 12 提升至 15，并根据距离补偿
  const basePower = 15;
  const distanceBonus = Math.min(minDistance / 80, 8); 
  const randomness = (Math.random() - 0.5) * 2; // 轻微随机扰动增加真实感
  
  const power = basePower + distanceBonus + randomness;

  return {
    angle,
    power: Math.min(power, 25) // 允许最高 25 的爆发力
  };
};
