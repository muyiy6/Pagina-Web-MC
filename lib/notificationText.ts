import { normalizeLang, type Lang } from '@/lib/i18n';

type NotificationText = {
  title: string;
  message: string;
};

const TITLE_ES_TO_EN: Record<string, string> = {
  'Ticket cerrado': 'Ticket closed',
  'Nuevo ticket de soporte': 'New support ticket',
  'Nuevo seguidor': 'New follower',
  '申请已接受': 'Application accepted',
  '申请已拒绝': 'Application rejected',
  'Respuesta en tu ticket': 'Reply in your ticket',
  'Nueva noticia': 'New announcement',
  'Nuevo post en el foro': 'New forum post',
  '你的帖子有新回复': 'New reply in your post',
};

function translateMessageEsToEn(message: string): string {
  const text = String(message || '').trim();
  if (!text) return text;

  if (text === '工作人员已关闭你的工单。如仍需帮助，可新建工单。') {
    return 'Your ticket was closed by staff. If you need more help, you can open another ticket.';
  }

  if (text === '工作人员回复了你的工单，前往支持中心查看。') {
    return 'Staff replied to your ticket. Open support to view the message.';
  }

  if (text === '你的管理团队申请已通过，已开启聊天与工作人员沟通。') {
    return 'Your staff application was accepted. A chat was opened so you can talk with staff.';
  }

  if (text === '你的管理团队申请已通过，我们会尽快联系你。') {
    return 'Your staff application was accepted. We will contact you soon.';
  }

  if (text === '你的管理团队申请未通过，感谢申请。') {
    return 'Your staff application was rejected. Thanks for applying.';
  }

  const newTicket = text.match(/^Nuevo ticket creado por\s+(.+)\.$/);
  if (newTicket) return `New ticket created by ${newTicket[1]}.`;

  const followedYou = text.match(/^(.+?)\s+empezó a seguirte\.$/);
  if (followedYou) return `${followedYou[1]} started following you.`;

  const forumPosted = text.match(/^(.+?)\s+publicó:\s+(.+)$/);
  if (forumPosted) return `${forumPosted[1]} posted: ${forumPosted[2]}`;

  const forumReply = text.match(/^(.+?)\s+respondió:\s+(.+)$/);
  if (forumReply) return `${forumReply[1]} replied: ${forumReply[2]}`;

  return text;
}

export function localizeNotificationText(rawLang: string | undefined | null, input: NotificationText): NotificationText {
  const lang: Lang = normalizeLang(rawLang);
  const title = String(input.title || '');
  const message = String(input.message || '');

  if (lang !== 'en') {
    return { title, message };
  }

  return {
    title: TITLE_ES_TO_EN[title] || title,
    message: translateMessageEsToEn(message),
  };
}
