import type { WindEvent } from './protocol';

export type OperationTone = 'buy' | 'sell' | 'view' | 'consensus' | 'neutral';

export interface OperationPresentation {
  label: string;
  tone: OperationTone;
}

function formatPositionPercent(percent: number): string {
  const bounded = Math.min(100, Math.max(0, percent));
  if (bounded >= 99.5) return '100%';
  if (bounded >= 10) return `${Math.round(bounded)}%`;
  return `${Math.round(bounded * 10) / 10}%`;
}

export function operationPresentation(event: WindEvent): OperationPresentation {
  const action = event.action?.toLowerCase() ?? '';

  if (action === 'fomo_consensus' || action.includes('consensus')) {
    return { label: '共识', tone: 'consensus' };
  }
  if (action === 'fomo_thesis') return { label: '观点', tone: 'view' };
  if (action === 'fomo_swap') return { label: '换仓', tone: 'neutral' };
  if (action === 'fomo_cash') return { label: '资金', tone: 'neutral' };
  if (action === 'fomo_verified') return { label: '认证', tone: 'neutral' };
  if (action === 'binance_new') return { label: '上新', tone: 'neutral' };
  if (action === 'ansem_tier') return { label: '等级', tone: 'neutral' };
  if (action === 'ansem_burn') return { label: '烧币', tone: 'neutral' };
  if (action === 'follow') return { label: '关注', tone: 'neutral' };
  if (action === 'unfollow') return { label: '取关', tone: 'neutral' };
  if (action === 'photo') return { label: '换头像', tone: 'neutral' };
  if (action === 'banner') return { label: '换横幅', tone: 'neutral' };
  if (action === 'description') return { label: '更新简介', tone: 'neutral' };
  if (action === 'name') return { label: '改名', tone: 'neutral' };
  if (action === 'handle') return { label: '改账号', tone: 'neutral' };
  if (action === 'pin') return { label: '置顶', tone: 'neutral' };
  if (action === 'unpin') return { label: '取消置顶', tone: 'neutral' };

  if (action.includes('buy') || action.includes('callout')) {
    const step = event.position?.sequence;
    const detail =
      step === 'first' ? '首次' : step === 'reenter' ? '再建仓' : step === 'add' ? '加仓' : '';
    return { label: detail ? `买入 · ${detail}` : '买入', tone: 'buy' };
  }

  if (action.includes('sell')) {
    if (event.position?.closed) return { label: '卖出 · 清仓', tone: 'sell' };
    if (event.position?.percent != null) {
      return {
        label: `卖出 · ${formatPositionPercent(event.position.percent)}`,
        tone: 'sell',
      };
    }
    return { label: '卖出', tone: 'sell' };
  }

  if (action.includes('update')) return { label: '更新', tone: 'neutral' };
  if (action.includes('reply')) return { label: '回复', tone: 'neutral' };
  if (action.includes('quote')) return { label: '引用', tone: 'neutral' };
  if (action.includes('repost')) return { label: '转发', tone: 'neutral' };
  if (action.includes('delete')) return { label: '删除', tone: 'neutral' };
  if (action.includes('tweet') || action.includes('post')) {
    return { label: '动态', tone: 'neutral' };
  }
  return { label: '动态', tone: 'neutral' };
}
