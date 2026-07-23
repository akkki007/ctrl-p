"use client";

import {
  ORDER_STATUS_LABELS,
  ORDER_TIMELINE,
  type OrderStatus,
  type OrderStatusEvent,
} from "@ctrlp/shared";

const BADGE_CLASSES: Record<OrderStatus, string> = {
  placed: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  printing: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
  framing: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  qc: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  shipped: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
  delivered: "bg-green-500/15 text-green-600 dark:text-green-300",
  cancelled: "bg-red-500/15 text-red-600 dark:text-red-300",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_CLASSES[status]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

/**
 * Vertical progress timeline. Steps reached (present in history) are filled;
 * the current status glows; future steps are dimmed. Cancelled orders show a
 * single terminal marker instead of the pipeline.
 */
export function OrderTimeline({
  status,
  history,
}: {
  status: OrderStatus;
  history: OrderStatusEvent[];
}) {
  if (status === "cancelled") {
    return (
      <div className="rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
        This order was cancelled.
      </div>
    );
  }

  const reached = new Set(history.map((h) => h.status));
  const currentIndex = ORDER_TIMELINE.indexOf(status);
  const eventFor = (s: OrderStatus) => history.find((h) => h.status === s);

  return (
    <ol className="relative flex flex-col gap-6 pl-6">
      <span className="absolute left-[7px] top-2 bottom-2 w-px bg-border" aria-hidden />
      {ORDER_TIMELINE.map((step, i) => {
        const done = reached.has(step) || i < currentIndex;
        const current = i === currentIndex;
        const event = eventFor(step);
        return (
          <li key={step} className="relative flex items-start gap-3">
            <span
              className={`absolute -left-6 mt-1 h-3.5 w-3.5 rounded-full border-2 ${
                current
                  ? "border-accent bg-accent"
                  : done
                    ? "border-accent bg-accent"
                    : "border-border bg-background"
              }`}
              aria-hidden
            />
            <div>
              <p className={`text-sm font-medium ${done || current ? "" : "text-muted"}`}>
                {ORDER_STATUS_LABELS[step]}
              </p>
              {event && (
                <p className="text-xs text-muted">
                  {new Date(event.createdAt).toLocaleString()}
                  {event.note ? ` · ${event.note}` : ""}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
