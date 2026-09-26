import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarDays, RefreshCw } from "lucide-react";
import { Button } from "@productivity-os/shared-ui/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@productivity-os/shared-ui/components/ui/chart";
import {
  revisionData,
  type RevisionDashboard,
  type RevisionDeckSummary,
} from "@/api/revision-data";

const orange = "#FFA800";
const chartConfig = {
  learned: { label: "Cards learned", color: orange },
  cumulative: { label: "Cumulative", color: orange },
  reviews: { label: "Reviews", color: orange },
  retention: { label: "Retention", color: "#55c98b" },
  time: { label: "Review minutes", color: "#8b7cf6" },
  dueCards: { label: "Due cards", color: orange },
  cards: { label: "Cards", color: orange },
  learnedCards: { label: "Learned", color: orange },
} satisfies ChartConfig;

type Preset = 7 | 30 | 90 | 365 | "custom";

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function inputDate(value: Date) {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

function chartLabel(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(timestamp);
}

function durationLabel(milliseconds: number) {
  if (milliseconds < 60_000) return `${Math.round(milliseconds / 1_000)} secs`;
  return `${Math.round(milliseconds / 60_000)} mins`;
}

export function Dashboard({
  decks,
  onStartReview,
}: {
  decks: RevisionDeckSummary[];
  onStartReview(notebookId?: string): void;
}) {
  const [preset, setPreset] = React.useState<Preset>(7);
  const [bucket, setBucket] = React.useState<"day" | "week" | "month">("day");
  const [notebookId, setNotebookId] = React.useState("");
  const today = React.useMemo(() => startOfDay(new Date()), []);
  const [customStart, setCustomStart] = React.useState(
    inputDate(new Date(today.getTime() - 6 * 86_400_000)),
  );
  const [customEnd, setCustomEnd] = React.useState(inputDate(today));
  const [data, setData] = React.useState<RevisionDashboard | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const range = React.useMemo(() => {
    if (preset === "custom") {
      return {
        start: startOfDay(new Date(`${customStart}T00:00:00`)),
        end: new Date(`${customEnd}T23:59:59.999`),
      };
    }
    return {
      start: new Date(today.getTime() - (preset - 1) * 86_400_000),
      end: new Date(today.getTime() + 86_400_000 - 1),
    };
  }, [customEnd, customStart, preset, today]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await revisionData.dashboard({
          notebookId: notebookId || null,
          startAt: range.start.getTime(),
          endAt: range.end.getTime(),
          bucket,
          utcOffsetMinutes: -new Date().getTimezoneOffset(),
        }),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [bucket, notebookId, range.end, range.start]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const points = React.useMemo(() => {
    let cumulative = Math.max(
      0,
      (data?.cumulativeLearnedCards ?? 0) - (data?.learnedCards ?? 0),
    );
    return (data?.points ?? []).map((point) => {
      cumulative += point.learned;
      return {
        ...point,
        label: chartLabel(point.bucketStart),
        cumulative,
        retention: point.reviews
          ? Math.round((point.correct / point.reviews) * 100)
          : 0,
        time: Math.round(point.reviewTimeMs / 60_000),
      };
    });
  }, [data]);

  const retention = data?.totalReviews
    ? Math.round((data.correctReviews / data.totalReviews) * 100)
    : null;

  return (
    <main className="revise-dashboard">
      <div className="revise-dashboard-toolbar">
        <div className="revise-filter-group">
          {[7, 30, 90, 365].map((days) => (
            <Button
              key={days}
              type="button"
              size="sm"
              variant={preset === days ? "secondary" : "ghost"}
              onClick={() => setPreset(days as Preset)}
            >
              Last {days} days
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant={preset === "custom" ? "secondary" : "ghost"}
            onClick={() => setPreset("custom")}
          >
            <CalendarDays />
            Custom
          </Button>
        </div>
        {preset === "custom" && (
          <div className="revise-date-range">
            <input
              type="date"
              value={customStart}
              onChange={(event) => setCustomStart(event.target.value)}
            />
            <span>to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(event) => setCustomEnd(event.target.value)}
            />
          </div>
        )}
        <select
          value={bucket}
          onChange={(event) => setBucket(event.target.value as typeof bucket)}
          aria-label="Dashboard aggregation"
        >
          <option value="day">Daily</option>
          <option value="week">Weekly</option>
          <option value="month">Monthly</option>
        </select>
        <select
          value={notebookId}
          onChange={(event) => setNotebookId(event.target.value)}
          aria-label="Notebook filter"
        >
          <option value="">All Notebooks</option>
          {decks.map((deck) => (
            <option key={deck.notebookId} value={deck.notebookId}>
              {deck.title}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          onClick={() => onStartReview(notebookId || undefined)}
        >
          Review due cards
        </Button>
      </div>

      <section className="revise-activity-panel">
        <div className="revise-section-heading">
          <div>
            <h1>Review Activity</h1>
            <p>
              {data?.totalReviews ?? 0} reviews · {data?.activeDays ?? 0} active
              days
            </p>
          </div>
          {loading && <RefreshCw className="spinning" />}
        </div>
        {error ? (
          <div className="revise-empty">
            {error}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void load()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <ActivityGrid
            days={data?.activity ?? []}
            start={range.start}
            end={range.end}
          />
        )}
      </section>

      <section className="revise-metrics-grid">
        <MetricChart
          title="Cards learned"
          value={data?.learnedCards ?? 0}
          data={points}
          dataKey="learned"
          kind="bar"
        />
        <MetricChart
          title="Cards learned (cumulative)"
          value={data?.cumulativeLearnedCards ?? 0}
          data={points}
          dataKey="cumulative"
          kind="line"
        />
        <MetricChart
          title="Reviews"
          value={data?.totalReviews ?? 0}
          data={points}
          dataKey="reviews"
          kind="bar"
        />
        <MetricChart
          title="Retention rate"
          value={retention == null ? "—%" : `${retention}%`}
          data={points}
          dataKey="retention"
          kind="line"
          suffix="%"
        />
        <MetricChart
          title="Review time"
          value={durationLabel(data?.reviewTimeMs ?? 0)}
          data={points}
          dataKey="time"
          kind="bar"
          suffix=" min"
        />
        <MetricChart
          title="Review forecast"
          value={`${data?.forecast.reduce((sum, point) => sum + point.dueCards, 0) ?? 0} cards`}
          data={(data?.forecast ?? []).map((point) => ({
            ...point,
            label: chartLabel(point.bucketStart),
          }))}
          dataKey="dueCards"
          kind="bar"
        />
        <MetricChart
          title="Intervals"
          value={`${data?.intervals.reduce((sum, item) => sum + item.cards, 0) ?? 0} cards`}
          data={data?.intervals ?? []}
          dataKey="cards"
          kind="bar"
        />
        <MetricChart
          title="Notebook progress"
          value={`${data?.decks.reduce((sum, deck) => sum + deck.learnedCards, 0) ?? 0} learned`}
          data={(data?.decks ?? []).map((deck) => ({
            ...deck,
            label: deck.title,
          }))}
          dataKey="learnedCards"
          kind="bar"
        />
      </section>
    </main>
  );
}

function ActivityGrid({
  days,
  start,
  end,
}: {
  days: { localDate: string; reviews: number }[];
  start: Date;
  end: Date;
}) {
  const reviewsByDate = new Map(
    days.map((day) => [day.localDate, day.reviews]),
  );
  const calendarDays: { localDate: string; reviews: number }[] = [];
  for (
    let cursor = startOfDay(start);
    cursor <= end && calendarDays.length < 366;
    cursor = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + 1,
    )
  ) {
    const localDate = inputDate(cursor);
    calendarDays.push({
      localDate,
      reviews: reviewsByDate.get(localDate) ?? 0,
    });
  }
  const maximum = Math.max(1, ...calendarDays.map((day) => day.reviews));
  return (
    <div
      className="revise-activity-grid"
      role="img"
      aria-label="Daily review activity"
    >
      {calendarDays.map((day) => (
        <span
          key={day.localDate}
          title={`${day.localDate}: ${day.reviews} reviews`}
          style={
            {
              "--activity": day.reviews
                ? Math.max(0.18, day.reviews / maximum)
                : 0,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function MetricChart({
  title,
  value,
  data,
  dataKey,
  kind,
  suffix,
}: {
  title: string;
  value: string | number;
  data: Record<string, unknown>[];
  dataKey: string;
  kind: "bar" | "line";
  suffix?: string;
}) {
  const hasData = data.some((item) => Number(item[dataKey]) > 0);
  return (
    <article className="revise-metric-card">
      <h2>{title}</h2>
      <strong>{value}</strong>
      {hasData ? (
        <ChartContainer config={chartConfig} className="revise-chart">
          {kind === "bar" ? (
            <BarChart
              data={data}
              margin={{ top: 10, right: 4, bottom: 0, left: -26 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey={dataKey}
                fill={`var(--color-${dataKey})`}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : (
            <LineChart
              data={data}
              margin={{ top: 10, right: 8, bottom: 0, left: -26 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(next) => `${next}${suffix ?? ""}`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={`var(--color-${dataKey})`}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          )}
        </ChartContainer>
      ) : (
        <div className="revise-chart-empty">No data for this period</div>
      )}
    </article>
  );
}
