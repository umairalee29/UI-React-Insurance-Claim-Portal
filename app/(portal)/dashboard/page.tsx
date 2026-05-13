import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Claim from "@/models/Claim";
import Link from "next/link";
import { ClaimStatusBadge } from "@/components/claims/ClaimStatusBadge";
import { Card } from "@/components/ui/Card";
import { IClaim, IStatusHistoryEntry } from "@/types";

export const metadata: Metadata = { title: "Dashboard" };

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relativeDate(d: Date | string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  if (diff < 30) return `${Math.floor(diff / 7)} week${Math.floor(diff / 7) > 1 ? 's' : ''} ago`
  return formatDate(d)
}

function getDateGroup(d: Date | string): string {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return 'Earlier'
}

const STATUS_FEED: Record<string, { label: string; bar: string; textColor: string }> = {
  draft:        { label: 'Saved as Draft',   bar: 'bg-gray-300',   textColor: 'text-gray-500'  },
  submitted:    { label: 'Claim Submitted',  bar: 'bg-blue-400',   textColor: 'text-blue-600'  },
  under_review: { label: 'Under Review',     bar: 'bg-amber-400',  textColor: 'text-amber-600' },
  approved:     { label: 'Claim Approved',   bar: 'bg-green-400',  textColor: 'text-green-600' },
  rejected:     { label: 'Claim Rejected',   bar: 'bg-red-400',    textColor: 'text-red-600'   },
  closed:       { label: 'Claim Closed',     bar: 'bg-purple-400', textColor: 'text-purple-600'},
}

const TYPE_CONFIG: Record<string, { label: string; iconBg: string; iconColor: string; iconPath: string }> = {
  auto:   { label: 'Auto Insurance',   iconBg: 'bg-blue-100',    iconColor: 'text-blue-600',   iconPath: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h1m8 0H9m4 0h2m4 0h1v-5l-3-4h-2' },
  home:   { label: 'Home Insurance',   iconBg: 'bg-violet-100',  iconColor: 'text-violet-600', iconPath: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  health: { label: 'Health Insurance', iconBg: 'bg-rose-100',    iconColor: 'text-rose-600',   iconPath: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  life:   { label: 'Life Insurance',   iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600',iconPath: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  travel: { label: 'Travel Insurance', iconBg: 'bg-orange-100',  iconColor: 'text-orange-600', iconPath: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8' },
}

interface StatCard {
  label: string;
  value: number;
  sub: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  barColor: string;
  barPct: number;
  barLabel: string;
  iconPath: string;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Welcome back";
}

function getHeroSummary(stats: {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}) {
  if (stats.total === 0)
    return "You haven't filed any claims yet. Get started below.";
  if (stats.pending > 0)
    return `You have ${stats.pending} claim${stats.pending > 1 ? "s" : ""} currently awaiting review.`;
  if (stats.approved > 0 && stats.pending === 0)
    return `Great news — ${stats.approved} of your claim${stats.approved > 1 ? "s have" : " has"} been approved.`;
  return `You have ${stats.total} claim${stats.total > 1 ? "s" : ""} on file. Everything is up to date.`;
}

export default async function DashboardPage() {
  const session = await auth();
  await connectDB();

  const claims = (await Claim.find({ claimantId: session!.user.id })
    .sort({ createdAt: -1 })
    .lean()) as unknown as IClaim[];

  const stats = {
    total: claims.length,
    pending: claims.filter((c) =>
      ["submitted", "under_review"].includes(c.status),
    ).length,
    approved: claims.filter((c) => c.status === "approved").length,
    rejected: claims.filter((c) => c.status === "rejected").length,
  };

  const recentClaims = claims.slice(0, 5);

  const allHistory = claims
    .flatMap((c) =>
      (c.statusHistory ?? []).map((h: IStatusHistoryEntry) => ({
        ...h,
        claimNumber: c.claimNumber,
        claimId: c._id,
      })),
    )
    .sort(
      (a, b) =>
        new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
    )
    .slice(0, 5);

  const submittedCount = claims.filter((c) => c.status === 'submitted').length
  const underReviewCount = claims.filter((c) => c.status === 'under_review').length
  const lastApproved = claims.find((c) => c.status === 'approved')
  const lastRejected = claims.find((c) => c.status === 'rejected')

  const statCards: StatCard[] = [
    {
      label: 'Total Claims',
      value: stats.total,
      sub: stats.total === 0 ? 'No claims filed yet' : 'Across all statuses',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-t-blue-500',
      barColor: 'bg-blue-500',
      barPct: stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0,
      barLabel: 'Active rate',
      iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    },
    {
      label: 'Pending Review',
      value: stats.pending,
      sub: stats.pending === 0
        ? 'No claims awaiting action'
        : `${submittedCount} submitted · ${underReviewCount} under review`,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      borderColor: 'border-t-amber-500',
      barColor: 'bg-amber-500',
      barPct: stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0,
      barLabel: '% of total',
      iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      label: 'Approved',
      value: stats.approved,
      sub: lastApproved
        ? `Last approved ${formatDate(lastApproved.updatedAt)}`
        : 'No approvals yet',
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-t-green-500',
      barColor: 'bg-green-500',
      barPct: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0,
      barLabel: '% of total',
      iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      label: 'Rejected',
      value: stats.rejected,
      sub: lastRejected
        ? `Last rejected ${formatDate(lastRejected.updatedAt)}`
        : 'No rejections yet',
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
      borderColor: 'border-t-red-500',
      barColor: 'bg-red-500',
      barPct: stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0,
      barLabel: '% of total',
      iconPath: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    },
  ];

  const greeting = getGreeting();
  const heroSummary = getHeroSummary(stats);
  const firstName = session!.user.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/75 px-8 py-8 text-white">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-14 -right-4 w-72 h-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute top-6 right-40 w-20 h-20 rounded-full bg-white/5" />

        <div className="relative flex items-center justify-between gap-6 flex-wrap">
          {/* Left: greeting + summary */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-white/60 uppercase tracking-widest">
                {greeting}
              </p>
              <h1 className="text-3xl font-heading font-bold text-white mt-1">
                {firstName} 👋
              </h1>
            </div>
            <p className="text-white/75 text-base max-w-sm leading-relaxed">
              {heroSummary}
            </p>

          </div>

          {/* Right: CTA */}
          <Link
            href="/claims/new"
            className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-white text-primary rounded-xl font-semibold text-sm shadow-lg shadow-black/10 hover:bg-white/90 transition-colors shrink-0"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
            File a New Claim
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
            <div
              key={card.label}
              className={`bg-white rounded-xl border border-gray-100 border-t-4 ${card.borderColor} shadow-sm p-5 flex flex-col justify-between gap-4`}
            >
              {/* Top row: text left, icon right */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1.5">{card.value}</p>
                  <p className="text-xs text-gray-400 mt-1.5 leading-snug">{card.sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center shrink-0`}>
                  <svg className={`w-5 h-5 ${card.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={card.iconPath} />
                  </svg>
                </div>
              </div>

              {/* Bottom: progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{card.barLabel}</span>
                  <span className={`text-xs font-semibold ${card.iconColor}`}>{card.barPct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-1.5 ${card.barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${card.barPct}%` }}
                  />
                </div>
              </div>
            </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card
            title="Recent Claims"
            action={
              <Link href="/claims" className="text-sm text-primary font-medium hover:underline">
                View all
              </Link>
            }
          >
            {recentClaims.length === 0 ? (
              <div className="px-6 py-14 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">No claims yet</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <Link href="/claims/new" className="text-primary hover:underline font-medium">File your first claim</Link>
                    {' '}to get started.
                  </p>
                </div>
              </div>
            ) : (
              <div className="px-6 py-4 space-y-3">
                {recentClaims.map((claim) => {
                  const typeCfg = TYPE_CONFIG[claim.type] ?? TYPE_CONFIG.auto
                  return (
                    <Link
                      key={String(claim._id)}
                      href={`/claims/${claim._id}`}
                      className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-primary/5 border border-transparent hover:border-primary/20 rounded-xl transition-all group"
                    >
                      {/* Type icon */}
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${typeCfg.iconBg}`}>
                        <svg className={`w-5 h-5 ${typeCfg.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={typeCfg.iconPath} />
                        </svg>
                      </div>

                      {/* Middle: claim info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800 group-hover:text-primary transition-colors">
                            {claim.claimNumber}
                          </p>
                          <ClaimStatusBadge status={claim.status} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{typeCfg.label} · {relativeDate(claim.createdAt)}</p>
                      </div>

                      {/* Right: amount + arrow */}
                      <div className="text-right shrink-0">
                        <p className="text-base font-bold text-gray-900">{formatCurrency(claim.estimatedAmount)}</p>
                        <p className="text-xs text-gray-400 mt-0.5 group-hover:text-primary transition-colors">View details →</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card title="Recent Activity">
            {allHistory.length === 0 ? (
              <div className="px-6 py-14 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">No activity yet</p>
                  <p className="text-xs text-gray-400 mt-0.5">Status updates will appear here.</p>
                </div>
              </div>
            ) : (
              <>
              <div className="px-6 py-4 space-y-5">
                {(['Today', 'Yesterday', 'Earlier'] as const).map((group) => {
                  const entries = allHistory.filter((e) => getDateGroup(e.changedAt) === group)
                  if (entries.length === 0) return null
                  return (
                    <div key={group}>
                      {/* Group header */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{group}</span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>

                      {/* Entries */}
                      <div className="space-y-1">
                        {entries.map((entry, idx) => {
                          const cfg = STATUS_FEED[entry.status] ?? STATUS_FEED.draft
                          return (
                            <div key={idx} className="flex gap-3 py-2">
                              <div className={`w-1 rounded-full shrink-0 my-0.5 ${cfg.bar}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className={`text-xs font-semibold uppercase tracking-wide ${cfg.textColor}`}>
                                      {cfg.label}
                                    </p>
                                    <Link
                                      href={`/claims/${entry.claimId}`}
                                      className="text-sm font-medium text-gray-800 hover:text-primary transition-colors"
                                    >
                                      {entry.claimNumber}
                                    </Link>
                                    {entry.note && (
                                      <p className="text-xs text-gray-400 mt-0.5 truncate">{entry.note}</p>
                                    )}
                                  </div>
                                  <time className="text-xs text-gray-400 shrink-0 whitespace-nowrap mt-0.5">
                                    {relativeDate(entry.changedAt)}
                                  </time>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="px-6 py-3 border-t border-gray-100">
                <Link
                  href="/claims"
                  className="flex items-center justify-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary transition-colors"
                >
                  View all activity
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
