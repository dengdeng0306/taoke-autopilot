/**
 * 风险监控模块
 * 监控商品状态、佣金变动、链接有效性等
 * 
 * @module monitor
 */

import path from 'path';
import { readJSON, writeJSON, now, logger } from '../../utils/csv.js';

const MONITOR_FILE = path.resolve('output/监控/监控状态.json');
const HISTORY_FILE = path.resolve('output/监控/告警历史.json');

/**
 * 告警级别
 */
const ALERT_LEVELS = {
  EMERGENCY: '🔴 紧急',
  WARNING: '🟡 警告',
  INFO: '🔵 通知',
};

/**
 * 检查推广链接是否有效
 * @param {string} itemId
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export async function checkLink(itemId) {
  // TODO: 通过浏览器导航到商品页检测是否404
  return { valid: true };
}

/**
 * 检查佣金率是否变动
 * @param {string} itemId
 * @param {string} prevRate - 历史佣金率
 * @param {number} threshold - 变动阈值（相对值）
 * @returns {Promise<{changed: boolean, newRate?: string, diff?: number}>}
 */
export async function checkRateChange(itemId, prevRate, threshold = 0.2) {
  // TODO: 从页面获取当前佣金率，与历史值比较
  return { changed: false };
}

/**
 * 检查系统状态
 * @returns {Object} 系统健康度报告
 */
export function systemHealth() {
  return {
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };
}

/**
 * 发送告警（通过飞书消息）
 * @param {string} level - 告警级别
 * @param {string} title - 告警标题
 * @param {string} detail - 详情
 */
export async function sendAlert(level, title, detail) {
  const { timestamp } = now();
  const alert = {
    level,
    title,
    detail,
    time: timestamp,
  };

  // 记录告警历史
  const history = readJSON(HISTORY_FILE) || [];
  history.push(alert);
  writeJSON(HISTORY_FILE, history);

  logger('monitor', `[${level}] ${title}`, level.includes('紧急') ? 'ERROR' : 'WARN');

  // TODO: 通过OpenClaw message工具推送到飞书
  // 红色紧急告警需要即时推送
}

/**
 * 检查是否需要告警
 * @param {Object} state - 当前状态
 */
export function evaluateAlerts(state) {
  const alerts = [];

  // 检测：连续登录失败
  if ((state.loginFailures || 0) >= 3) {
    alerts.push({
      level: ALERT_LEVELS.EMERGENCY,
      title: '淘宝联盟登录连续失败',
      detail: `已连续失败${state.loginFailures}次，自动化已暂停`,
    });
  }

  // 检测：商品佣金率变动
  if (state.rateDrops && state.rateDrops.length > 0) {
    for (const drop of state.rateDrops) {
      if (drop.dropPercent > 20) {
        alerts.push({
          level: ALERT_LEVELS.WARNING,
          title: `商品佣金率下降 >${drop.dropPercent}%`,
          detail: `${drop.name}: ${drop.oldRate} → ${drop.newRate}`,
        });
      }
    }
  }

  return alerts;
}

export { ALERT_LEVELS };

export default {
  checkLink,
  checkRateChange,
  systemHealth,
  sendAlert,
  evaluateAlerts,
};
