'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaBook, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import PageHeader from '@/components/PageHeader';
import { Card } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';

export default function NormasPage() {
  const lang = useClientLang();
  const [openSection, setOpenSection] = useState<number | null>(0);

  const content =
    lang === 'en'
      ? {
          pageTitle: 'Server Rules',
          pageDesc: 'Read and follow our rules to keep a healthy community',
          serverTitle: '📜 Server Rules',
          discordTitle: '💬 Discord Rules',
          consequencesTitle: '⚖️ Consequences',
          noteTitle: '⚠️ Important note:',
          note:
            'Staff reserves the right to apply penalties based on context and severity. Rules may be updated at any time.',
          normasServidor: [
            {
              title: 'Respect and behavior',
              rules: [
                'Harassment, discrimination or offensive language is not allowed',
                'Respect all players and staff',
                'No chat spam',
                'No advertising other servers',
                'Keep a positive environment',
              ],
            },
            {
              title: 'Fair play',
              rules: [
                'No hacks, cheating mods or exploits',
                'Xray, fly hacks or kill aura are not allowed',
                "Don't abuse server bugs",
                'Report any bug you find',
                'Do not intentionally create lag',
              ],
            },
            {
              title: 'Building and griefing',
              rules: [
                'No griefing in protected areas',
                "Respect other players' builds",
                'Do not steal from unprotected chests (considered a severe offense)',
                'Keep your builds appropriate',
                'Do not build close to others without permission',
              ],
            },
            {
              title: 'Economy and trading',
              rules: [
                'Do not scam other players',
                'Honor trading agreements',
                'Do not manipulate the market',
                'Report scams to staff',
                'Transactions are your responsibility',
              ],
            },
            {
              title: 'Chat and communication',
              rules: [
                'No flood or excessive caps lock',
                'Do not share personal information',
                'No external links without authorization',
                'Use the appropriate channels',
                'Primary language is Spanish',
              ],
            },
          ],
          normasDiscord: [
            {
              title: 'General Discord rules',
              rules: [
                'Respect all members',
                'Use the appropriate channels for each topic',
                'No spam or mass mentions',
                'No NSFW content',
                'Follow Discord rules',
              ],
            },
            {
              title: 'Support and tickets',
              rules: [
                'One ticket per person',
                'Be clear and specific about your issue',
                'Provide evidence if needed',
                'Be patient while waiting for a response',
                'Do not open multiple tickets about the same topic',
              ],
            },
          ],
          consecuencias: [
            { infraccion: '1st minor offense', consecuencia: 'Verbal warning' },
            { infraccion: '2nd minor offense', consecuencia: 'Written warning' },
            { infraccion: '3rd minor offense', consecuencia: 'Temporary mute (1-24 hours)' },
            { infraccion: '1st major offense', consecuencia: 'Temporary ban (1-7 days)' },
            { infraccion: '2nd major offense', consecuencia: 'Temporary ban (7-30 days)' },
            { infraccion: 'Severe offense', consecuencia: 'Permanent ban' },
          ],
        }
      : {
          pageTitle: 'Normas del Servidor',
          pageDesc: 'Lee y respeta nuestras normas para mantener una comunidad sana',
          serverTitle: t(lang, 'rules.serverTitle'),
          discordTitle: t(lang, 'rules.discordTitle'),
          consequencesTitle: t(lang, 'rules.consequencesTitle'),
          noteTitle: '⚠️ Nota Importante:',
          note:
            '管理团队保留根据具体情况和严重程度实施处罚的权利。规则可能随时更新。',
          normasServidor: [
            {
              title: 'Respeto y Comportamiento',
              rules: [
                '禁止骚扰、歧视或攻击性言论',
                'Respeta a todos los jugadores y al staff',
                'No spam en el chat',
                'No publicidad de otros servidores',
                '保持友善氛围',
              ],
            },
            {
              title: 'Juego Limpio',
              rules: [
                'Prohibido el uso de hacks, mods trampa o exploits',
                '禁止使用 Xray、飞行外挂或杀戮光环',
                'No aprovecharse de bugs del servidor',
                'Reporta cualquier bug que encuentres',
                'No crear lag intencionalmente',
              ],
            },
            {
              title: 'Construcciones y Griefing',
              rules: [
                'No griefing en zonas protegidas',
                'Respeta las construcciones de otros jugadores',
                'No robar de cofres no protegidos (se considera falta grave)',
                '请保持建筑内容得体',
                'No construir cerca de otros sin permiso',
              ],
            },
            {
              title: '经济与交易',
              rules: [
                'No estafar a otros jugadores',
                'Cumple los acuerdos comerciales',
                'No manipular el mercado',
                'Reporta estafas al staff',
                'Las transacciones son bajo tu responsabilidad',
              ],
            },
            {
              title: '聊天与交流',
              rules: [
                'No flood ni caps lock excesivo',
                '请勿分享个人信息',
                '未经允许禁止发布外部链接',
                'Usa los canales apropiados',
                '主要语言为西班牙语',
              ],
            },
          ],
          normasDiscord: [
            {
              title: 'Normas Generales Discord',
              rules: [
                'Respeta a todos los miembros',
                'Usa los canales apropiados para cada tema',
                'No spam ni menciones masivas',
                'No contenido NSFW',
                'Sigue las reglas de Discord',
              ],
            },
            {
              title: 'Soporte y Tickets',
              rules: [
                'Un ticket por persona',
                '请清楚具体地描述你的问题',
                'Proporciona evidencia si es necesario',
                '耐心等待回复',
                '同一主题不要重复开工单',
              ],
            },
          ],
          consecuencias: [
            { infraccion: '第 1 次轻微违规', consecuencia: 'Advertencia verbal' },
            { infraccion: '第 2 次轻微违规', consecuencia: 'Advertencia escrita' },
            { infraccion: '第 3 次轻微违规', consecuencia: 'Mute temporal (1-24 horas)' },
            { infraccion: '第 1 次严重违规', consecuencia: '临时封禁（1-7 天）' },
            { infraccion: '第 2 次严重违规', consecuencia: '临时封禁（7-30 天）' },
            { infraccion: '重大违规', consecuencia: 'Ban permanente' },
          ],
        };

  const RuleSection = ({ 
    title, 
    rules, 
    index 
  }: { 
    title: string; 
    rules: string[]; 
    index: number 
  }) => {
    const isOpen = openSection === index;

    return (
      <Card className="mb-4">
        <button
          onClick={() => setOpenSection(isOpen ? null : index)}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
          {isOpen ? (
            <FaChevronUp className="text-minecraft-grass" />
          ) : (
            <FaChevronDown className="text-gray-400" />
          )}
        </button>

        {isOpen && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-2"
          >
            {rules.map((rule, i) => (
              <li key={i} className="flex items-start space-x-3 text-gray-700 dark:text-gray-300">
                <span className="text-minecraft-grass font-bold mt-1">•</span>
                <span>{rule}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <PageHeader
        title={content.pageTitle}
        description={content.pageDesc}
        icon={<FaBook className="text-6xl text-minecraft-grass" />}
      />

      {/* Normas del Servidor */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{content.serverTitle}</h2>
        {content.normasServidor.map((section, index) => (
          <RuleSection
            key={index}
            title={section.title}
            rules={section.rules}
            index={index}
          />
        ))}
      </section>

      {/* Normas de Discord */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{content.discordTitle}</h2>
        {content.normasDiscord.map((section, index) => (
          <RuleSection
            key={index + content.normasServidor.length}
            title={section.title}
            rules={section.rules}
            index={index + content.normasServidor.length}
          />
        ))}
      </section>

      {/* Consecuencias */}
      <section>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{content.consequencesTitle}</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-minecraft-grass">{t(lang, 'rules.offense')}</th>
                  <th className="text-left py-3 px-4 text-minecraft-grass">{t(lang, 'rules.consequence')}</th>
                </tr>
              </thead>
              <tbody>
                {content.consecuencias.map((item, index) => (
                  <tr key={index} className="border-b border-gray-800 last:border-0">
                    <td className="py-3 px-4 text-gray-900 dark:text-white">{item.infraccion}</td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{item.consecuencia}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="mt-6 bg-minecraft-redstone/10 border-minecraft-redstone">
          <p className="text-gray-900 dark:text-white">
            <strong>{content.noteTitle}</strong> {content.note}
          </p>
        </Card>
      </section>
    </div>
  );
}
