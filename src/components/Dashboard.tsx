import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Crown,
  Flame,
  Info,
  Medal,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { competitionInfo } from '../data';
import bgImage from '../assets/back.webp';
import { Parameter, Participant } from '../types';
import { cn } from '../utils/cn';
import LeagueLogo from './LeagueLogo';

interface DashboardProps {
  participants: Participant[];
  parameters: Parameter[];
}

interface ParticipantMetric {
  id: string;
  name: string;
  score: number;
}

const numberFormatter = new Intl.NumberFormat('ru-RU');
const formatNumber = (value: number) => numberFormatter.format(value);

const getRankPalette = (rank: number) => {
  if (rank === 1) {
    return {
      label: '1 место · лидер сезона',
      frame: 'ring-1 ring-amber-300/30 border-amber-300/30',
      background: 'bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.26),transparent_52%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]',
      badge: 'border-amber-300/30 bg-amber-300/14 text-amber-100',
      score: 'text-amber-100',
      progress: 'from-amber-300 via-yellow-300 to-orange-400',
      accent: 'text-amber-200',
      icon: <Crown className="h-5 w-5" />,
    };
  }

  if (rank === 2) {
    return {
      label: '2 место · серебро',
      frame: 'ring-1 ring-sky-300/20 border-sky-300/20',
      background: 'bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.18),transparent_54%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))]',
      badge: 'border-sky-300/20 bg-sky-300/10 text-sky-100',
      score: 'text-sky-50',
      progress: 'from-sky-300 via-cyan-300 to-indigo-300',
      accent: 'text-sky-200',
      icon: <Medal className="h-5 w-5" />,
    };
  }

  if (rank === 3) {
    return {
      label: '3 место · бронза',
      frame: 'ring-1 ring-orange-300/20 border-orange-300/22',
      background: 'bg-[radial-gradient(circle_at_top,rgba(253,186,116,0.2),transparent_54%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))]',
      badge: 'border-orange-300/22 bg-orange-300/10 text-orange-100',
      score: 'text-orange-50',
      progress: 'from-orange-300 via-amber-300 to-yellow-300',
      accent: 'text-orange-200',
      icon: <Trophy className="h-5 w-5" />,
    };
  }

  if (rank === 4) {
    return {
      label: '4 место · элита',
      frame: 'ring-1 ring-emerald-300/20 border-emerald-300/20',
      background: 'bg-[radial-gradient(circle_at_top,rgba(110,231,183,0.18),transparent_54%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))]',
      badge: 'border-emerald-300/22 bg-emerald-300/10 text-emerald-100',
      score: 'text-emerald-50',
      progress: 'from-emerald-300 via-teal-300 to-cyan-300',
      accent: 'text-emerald-200',
      icon: <Star className="h-5 w-5" />,
    };
  }

  if (rank === 5) {
    return {
      label: '5 место · топ-линия',
      frame: 'ring-1 ring-fuchsia-300/18 border-fuchsia-300/18',
      background: 'bg-[radial-gradient(circle_at_top,rgba(240,171,252,0.18),transparent_54%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))]',
      badge: 'border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-100',
      score: 'text-fuchsia-50',
      progress: 'from-fuchsia-300 via-pink-300 to-violet-300',
      accent: 'text-fuchsia-200',
      icon: <Sparkles className="h-5 w-5" />,
    };
  }

  return {
    label: `${rank} место`,
    frame: 'border-white/10',
    background: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.025))]',
    badge: 'border-white/10 bg-white/[0.05] text-zinc-200',
    score: 'text-zinc-50',
    progress: 'from-amber-400 via-orange-300 to-yellow-300',
    accent: 'text-zinc-200',
    icon: <span className="text-sm font-semibold">{rank}</span>,
  };
};

const getParticipantMetrics = (
  participant: Participant,
  parameters: Parameter[],
  sortByImpact = false
): ParticipantMetric[] => {
  const items = parameters
    .map((parameter) => ({
      id: parameter.id,
      name: parameter.name,
      score: (participant.parameters[parameter.name] || 0) * parameter.weight,
    }))
    .filter((item) => item.score !== 0);

  if (!sortByImpact) {
    return items;
  }

  return items.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
};

const SummaryCard = ({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) => (
  <div className="surface-card rounded-[28px] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/14">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="subtle-label">{label}</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">{value}</p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{hint}</p>
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-amber-200">
        {icon}
      </div>
    </div>
  </div>
);

const TopFiveCard = ({
  participant,
  rank,
  leaderScore,
  parameters,
  featured = false,
}: {
  participant: Participant;
  rank: number;
  leaderScore: number;
  parameters: Parameter[];
  featured?: boolean;
}) => {
  const palette = getRankPalette(rank);
  const metrics = getParticipantMetrics(participant, parameters, true).slice(0, featured ? 6 : 4);
  const progress = leaderScore > 0 ? Math.max(8, (participant.totalScore / leaderScore) * 100) : 0;
  const gap = Math.max(0, leaderScore - participant.totalScore);

  return (
    <article
      className={cn(
        'surface-top-card animate-fade-in-up rounded-[32px] border p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/16',
        palette.frame,
        palette.background,
        featured ? 'min-h-[360px] md:p-8' : 'min-h-[250px]'
      )}
    >
      <div className="flex h-full flex-col justify-between gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em]', palette.badge)}>
              {palette.icon}
              <span>{palette.label}</span>
            </div>

            <h2
              className={cn(
                'mt-4 text-balance font-semibold leading-tight text-zinc-50',
                featured ? 'text-3xl md:text-[2.4rem]' : 'text-2xl md:text-[1.8rem]'
              )}
            >
              {participant.fullName}
            </h2>

            <div className="mt-4 flex flex-wrap gap-2.5 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-zinc-200">
                <Sparkles className="h-4 w-4 text-amber-200" />
                Бонус за выручку +{formatNumber(participant.revenueScore)}
              </span>
              {gap > 0 && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-zinc-400">
                  Отставание {formatNumber(gap)} баллов
                </span>
              )}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-black/20 px-4 py-3 text-right">
            <p className="subtle-label">Итог</p>
            <p className={cn('mt-2 text-5xl font-semibold tracking-tight', palette.score)}>
              {formatNumber(participant.totalScore)}
            </p>
            <p className="mt-1 text-sm text-zinc-400">баллов</p>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between text-sm text-zinc-400">
            <span>Прогресс к лидеру</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-black/25">
            <div
              className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out', palette.progress)}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div>
          <p className="subtle-label">Ключевые начисления</p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {metrics.length === 0 && (
              <span className="rounded-full border border-dashed border-white/10 px-3 py-2 text-sm text-zinc-500">
                Пока нет начислений по параметрам
              </span>
            )}
            {metrics.map((metric) => (
              <span
                key={metric.id}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-zinc-200"
              >
                <span className="text-zinc-400">{metric.name}</span>
                <span className={cn('font-semibold', metric.score < 0 ? 'text-rose-300' : 'text-amber-200')}>
                  {metric.score > 0 ? '+' : ''}
                  {formatNumber(metric.score)}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
};

const LeaderboardCard = ({
  participant,
  rank,
  leaderScore,
  parameters,
}: {
  participant: Participant;
  rank: number;
  leaderScore: number;
  parameters: Parameter[];
}) => {
  const palette = getRankPalette(rank);
  const metrics = getParticipantMetrics(participant, parameters);
  const progress = leaderScore > 0 ? Math.max(6, (participant.totalScore / leaderScore) * 100) : 0;
  const gap = Math.max(0, leaderScore - participant.totalScore);

  return (
    <article
      className={cn(
        'surface-card animate-slide-in-right rounded-[26px] border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/16 md:p-5',
        rank <= 5 && palette.frame,
        rank <= 5 && palette.background
      )}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(240px,0.8fr)] xl:items-start">
        <div>
          <div className="flex items-start gap-4">
            <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border', palette.badge)}>
              {palette.icon}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-balance text-2xl font-semibold leading-tight text-white">
                  {participant.fullName}
                </h3>
                <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
                  {rank} место
                </span>
                {gap > 0 && (
                  <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-400">
                    −{formatNumber(gap)} до лидера
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2.5">
                {metrics.length === 0 && (
                  <span className="rounded-full border border-dashed border-white/10 px-3 py-2 text-sm text-zinc-500">
                    Нет начислений по параметрам
                  </span>
                )}
                {metrics.map((metric) => (
                  <span
                    key={metric.id}
                    className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-2 text-sm"
                  >
                    <span className="text-zinc-400">{metric.name}</span>
                    <span className={cn('font-semibold', metric.score < 0 ? 'text-rose-300' : 'text-amber-200')}>
                      {metric.score > 0 ? '+' : ''}
                      {formatNumber(metric.score)}
                    </span>
                  </span>
                ))}
                <span className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-2 text-sm text-zinc-300">
                  <Sparkles className="h-4 w-4 text-amber-200" />
                  Бонус за выручку +{formatNumber(participant.revenueScore)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/8 bg-black/15 p-4 xl:text-right">
          <p className="subtle-label">Итог</p>
          <p className={cn('mt-2 text-5xl font-semibold tracking-tight', palette.score)}>
            {formatNumber(participant.totalScore)}
          </p>
          <p className="mt-1 text-sm text-zinc-400">баллов</p>
          <p className="mt-3 text-sm text-zinc-400">Начислено за выручку: {formatNumber(participant.revenueScore)}</p>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/6">
            <div
              className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out', palette.progress)}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </article>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ participants, parameters }) => {
  const [showPointsInfo, setShowPointsInfo] = useState(false);

  const sortedParticipants = useMemo(
    () => [...participants].sort((a, b) => b.totalScore - a.totalScore),
    [participants]
  );

  const leaderScore = sortedParticipants[0]?.totalScore ?? 0;
  const averageScore = useMemo(
    () => (participants.length > 0 ? Math.round(participants.reduce((sum, participant) => sum + participant.totalScore, 0) / participants.length) : 0),
    [participants]
  );
  const activeParticipants = useMemo(
    () => participants.filter((participant) => participant.totalScore > 0).length,
    [participants]
  );
  const topFiveCutoff = sortedParticipants[4]?.totalScore ?? 0;
  const leaderGap = sortedParticipants[1] ? leaderScore - sortedParticipants[1].totalScore : 0;

  const topFive = sortedParticipants.slice(0, 5);
  const leader = topFive[0];
  const eliteGroup = topFive.slice(1);
  const leaderboardItems = sortedParticipants.slice(5);

  const summaryCards = [
    {
      label: 'Участников',
      value: formatNumber(participants.length),
      hint: `${formatNumber(activeParticipants)} уже набрали баллы в этом рейтинге`,
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: 'Баллы лидера',
      value: formatNumber(leaderScore),
      hint: leader ? leader.fullName : 'Нет данных',
      icon: <Crown className="h-5 w-5" />,
    },
    {
      label: 'Средний балл',
      value: formatNumber(averageScore),
      hint: `${formatNumber(parameters.length)} параметров в системе`,
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      label: 'Порог топ-5',
      value: topFiveCutoff > 0 ? formatNumber(topFiveCutoff) : '—',
      hint: 'Минимальный результат для попадания в элитную пятёрку',
      icon: <Target className="h-5 w-5" />,
    },
  ];

  return (
    <>
      <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-white">
        <div className="pointer-events-none absolute inset-0">
          <img
            src={bgImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-[0.14] saturate-[0.9]"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(217,70,239,0.14),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_28%),linear-gradient(180deg,rgba(9,9,11,0.18)_0%,rgba(9,9,11,0.82)_46%,rgba(9,9,11,1)_100%)]" />
          <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:26px_26px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
          <section className="surface-panel-strong animate-fade-in-down rounded-[34px] p-6 md:p-8">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.18fr)_minmax(0,0.92fr)] xl:items-start">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/15 bg-amber-400/8 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.24em] text-amber-100/90">
                  <Sparkles className="h-3.5 w-3.5" />
                  Championship Ranking
                </div>

                <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="shrink-0 rounded-[30px] border border-white/10 bg-white/[0.05] p-2.5 shadow-[0_24px_70px_-38px_rgba(251,191,36,0.75)]">
                    <LeagueLogo size="sm" className="h-20 w-20 sm:h-24 sm:w-24" />
                  </div>

                  <div>
                    <p className="subtle-label">Турнир</p>
                    <h1 className="mt-2 text-balance text-4xl font-semibold tracking-tight text-white md:text-6xl">
                      {competitionInfo.title}
                    </h1>
                    <p className="mt-3 text-base text-zinc-300 md:text-lg">
                      {competitionInfo.startDate} — {competitionInfo.endDate}
                    </p>
                  </div>
                </div>

                <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-zinc-300 md:text-lg">
                  Новый экран рейтинга с выраженной иерархией: центральный фокус на лидерах, отдельный акцент на
                  первой пятёрке и более премиальная подача с чистой, соревновательной визуальной подачей.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPointsInfo(true)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-100 transition-all duration-300 hover:border-amber-300/35 hover:bg-amber-400/14"
                  >
                    <Info className="h-4 w-4" />
                    Как начисляются баллы
                  </button>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-300">
                    <span className="text-zinc-500">Отрыв лидера: </span>
                    <span className="font-semibold text-white">{formatNumber(leaderGap)} баллов</span>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-300">
                    <span className="text-zinc-500">Выделены места: </span>
                    <span className="font-semibold text-white">1–5</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {summaryCards.map((card) => (
                  <SummaryCard key={card.label} {...card} />
                ))}
              </div>
            </div>
          </section>

          {topFive.length > 0 && (
            <section className="mt-6">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="subtle-label">Элитная пятёрка</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                    Топ-5 участников сезона
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400 md:text-base">
                    Главный акцент интерфейса — на первых пяти местах. Каждая карточка выделена отдельно и показывает
                    только баллы и структуру начислений.
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-300">
                  <Flame className="h-4 w-4 text-amber-200" />
                  Порог входа в топ-5: {topFiveCutoff > 0 ? formatNumber(topFiveCutoff) : '—'} баллов
                </div>
              </div>

              {leader && (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(0,1fr)]">
                  <TopFiveCard
                    participant={leader}
                    rank={1}
                    leaderScore={leaderScore}
                    parameters={parameters}
                    featured
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    {eliteGroup.map((participant, index) => (
                      <TopFiveCard
                        key={participant.id}
                        participant={participant}
                        rank={index + 2}
                        leaderScore={leaderScore}
                        parameters={parameters}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="mt-6 surface-panel rounded-[32px] p-4 md:p-6">
            <div className="flex flex-col gap-4 border-b border-white/8 pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="subtle-label">Рейтинг</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                  {leaderboardItems.length > 0 ? 'Участники вне топ-5' : 'Весь состав уже отображён в элитной пятёрке'}
                </h2>
                <p className="mt-2 text-sm text-zinc-400 md:text-base">
                  Детализация по баллам, параметрам и бонусным начислениям в максимально чистой и понятной подаче.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-300">
                Показано <span className="font-semibold text-white">{formatNumber(sortedParticipants.length)}</span> участников
              </div>
            </div>

            {sortedParticipants.length === 0 && (
              <div className="px-6 py-18 text-center text-zinc-500">Нет данных для отображения</div>
            )}

            <div className="mt-5 space-y-3">
              {leaderboardItems.map((participant, index) => (
                <LeaderboardCard
                  key={participant.id}
                  participant={participant}
                  rank={index + 6}
                  leaderScore={leaderScore}
                  parameters={parameters}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      {showPointsInfo && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm md:p-8"
          onClick={() => setShowPointsInfo(false)}
        >
          <div
            className="surface-panel animate-scale-in w-full max-w-4xl rounded-[32px] p-5 md:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 pb-5">
              <div>
                <p className="subtle-label">Информация</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                  Начисление баллов
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-zinc-400 md:text-base">
                  Ниже — действующая формула рейтинга. Для параметров, которые не суммируются внутри месяца,
                  добавлена отдельная пометка.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPointsInfo(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-200 transition-all duration-300 hover:border-amber-300/20 hover:text-amber-100"
                aria-label="Закрыть окно"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="surface-card rounded-[24px] p-5 md:col-span-2 xl:col-span-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-200">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="subtle-label">Выручка</p>
                    <p className="mt-1 text-lg font-semibold text-white">5 баллов за каждые 50 000 ₽</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-400">
                  Баллы за выручку рассчитываются автоматически и добавляются к сумме баллов по всем параметрам.
                </p>
              </div>

              {parameters.map((parameter, index) => (
                <div
                  key={parameter.id}
                  className="surface-card animate-slide-in-right rounded-[24px] p-5"
                  style={{ animationDelay: `${index * 35}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-medium text-white">{parameter.name}</p>
                      <p className="mt-2 text-sm text-zinc-400">
                        1 единица = {parameter.weight > 0 ? '+' : ''}
                        {parameter.weight} баллов
                      </p>
                    </div>

                    <span
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs font-medium',
                        parameter.weight < 0
                          ? 'border-rose-300/20 bg-rose-400/10 text-rose-200'
                          : 'border-amber-300/20 bg-amber-400/10 text-amber-100'
                      )}
                    >
                      {parameter.weight > 0 ? '+' : ''}
                      {parameter.weight}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-400">
                      {parameter.shouldSum === false ? 'Заменяется в рамках месяца' : 'Суммируется'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;
