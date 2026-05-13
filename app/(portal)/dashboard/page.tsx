import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Claim from "@/models/Claim";
import Link from "next/link";
import { ClaimStatusBadge } from "@/components/claims/ClaimStatusBadge";
import { ClaimTypeIcon } from "@/components/claims/ClaimTypeIcon";
import { StatusTimeline } from "@/components/claims/StatusTimeline";
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

interface StatCard {
  label: string;
  value: number;
  sub: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  barColor: string;
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

  const recentClaims = claims.slice(0, 10);

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
    .slice(0, 10);

  const submittedCount = claims.filter((c) => c.status === 'submitted').length
  const underReviewCount = claims.filter((c) => c.status === 'under_review').length
  const lastApproved = claims.find((c) => c.status === 'approved')
  const lastRejected = claims.find((c) => c.status === 'rejected')

  const statCards: StatCard[] = [
    {
      label: 'Total Claims',
      value: stats.total,
      sub: stats.total === 0 ? 'No claims filed yet' : `${stats.total} claim${stats.total > 1 ? 's' : ''} on file`,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-t-blue-500',
      barColor: 'bg-blue-500',
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

            {/* Inline mini stats */}
            <div className="flex items-center gap-5 pt-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white/40" />
                <span className="text-sm text-white/70">
                  {stats.total} Total
                </span>
              </div>
              {stats.pending > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
                  <span className="text-sm text-white/70">
                    {stats.pending} Pending
                  </span>
                </div>
              )}
              {stats.approved > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-300" />
                  <span className="text-sm text-white/70">
                    {stats.approved} Approved
                  </span>
                </div>
              )}
              {stats.rejected > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
                  <span className="text-sm text-white/70">
                    {stats.rejected} Rejected
                  </span>
                </div>
              )}
            </div>
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
        {statCards.map((card) => {
          const pct = stats.total > 0 ? Math.round((card.value / stats.total) * 100) : 0
          return (
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
                  <span className="text-xs text-gray-400">% of total claims</span>
                  <span className={`text-xs font-semibold ${card.iconColor}`}>{pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-1.5 ${card.barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card
            title="Recent Claims"
            action={
              <Link
                href="/claims"
                className="text-sm text-primary font-medium hover:underline"
              >
                View all
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50">
                    {["Claim #", "Type", "Status", "Filed", "Amount"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ),
                    )}
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentClaims.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-gray-400 text-sm"
                      >
                        No claims yet.{" "}
                        <Link
                          href="/claims/new"
                          className="text-primary hover:underline"
                        >
                          File your first claim
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    recentClaims.map((claim) => (
                      <tr
                        key={String(claim._id)}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-primary">
                          <Link
                            href={`/claims/${claim._id}`}
                            className="hover:underline"
                          >
                            {claim.claimNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <ClaimTypeIcon type={claim.type} />
                        </td>
                        <td className="px-4 py-3">
                          <ClaimStatusBadge status={claim.status} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(claim.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                          {formatCurrency(claim.estimatedAmount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/claims/${claim._id}`}
                            className="text-xs text-primary hover:underline"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div>
          <Card title="Recent Activity">
            <div className="px-6 py-4">
              {allHistory.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No activity yet
                </p>
              ) : (
                <StatusTimeline
                  history={allHistory.map((h) => ({
                    status: h.status,
                    changedBy: String(h.changedBy),
                    changedAt: h.changedAt,
                    note: `${h.claimNumber}: ${h.note}`,
                  }))}
                />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
