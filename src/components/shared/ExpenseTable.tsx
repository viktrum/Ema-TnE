"use client";

import { useState, useCallback, Fragment } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { SourceIcons } from "./SourceIcons";
import { ReasoningPanel } from "./ReasoningPanel";
import { AlertTriangle, CheckCircle, Flag } from "lucide-react";

interface ExpenseItem {
  id: string;
  description: string;
  vendor: string;
  date: string;
  amount: number;
  currency: string;
  category: string;
  original_category: string | null;
  confidence: number;
  sources: string[];
  reasoning: string;
  policy_status: string;
  flag_reason: string | null;
  recommendation: string;
}

interface MissingItem {
  id: string;
  detected_gap: string;
  estimated_amount: number;
  currency: string;
  confidence: number;
  action_needed: string;
}

interface ExpenseTableProps {
  items: ExpenseItem[];
  missingItems?: MissingItem[];
  expandedItemId?: string | null;
  onToggleExpand?: (id: string) => void;
  dinnerPreExpanded?: boolean;
}

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "INR" ? "\u20B9" : currency;
  return `${symbol}${amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function isDinnerRow(item: ExpenseItem): boolean {
  return (
    item.category === "Client Entertainment" ||
    (item.original_category !== null && item.flag_reason !== null)
  );
}

function isGapRow(item: ExpenseItem): boolean {
  return item.recommendation === "request_employee_input";
}

function getRowStyles(item: ExpenseItem): string {
  if (isGapRow(item)) {
    return "bg-[#FEF9C3] border-l-3 border-l-[#EAB308] animate-pulse [animation-duration:3s]";
  }
  if (isDinnerRow(item)) {
    return "bg-[#FEF3C7] border-l-3 border-l-[#F59E0B]";
  }
  return "bg-white hover:bg-gray-50";
}

function PolicyStatusIcon({ status }: { status: string }) {
  if (status === "compliant" || status === "approved") {
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  }
  if (status === "flagged" || status === "review") {
    return <Flag className="h-4 w-4 text-amber-500" />;
  }
  if (status === "violation") {
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  }
  return <CheckCircle className="h-4 w-4 text-gray-400" />;
}

export function ExpenseTable({
  items,
  missingItems = [],
  expandedItemId: controlledExpandedId,
  onToggleExpand,
  dinnerPreExpanded = true,
}: ExpenseTableProps) {
  const [internalExpandedId, setInternalExpandedId] = useState<string | null>(
    () => {
      if (dinnerPreExpanded) {
        const dinnerItem = items.find(isDinnerRow);
        return dinnerItem?.id ?? null;
      }
      return null;
    }
  );

  const isControlled = controlledExpandedId !== undefined;
  const expandedId = isControlled ? controlledExpandedId : internalExpandedId;

  const handleToggle = useCallback(
    (id: string) => {
      if (onToggleExpand) {
        onToggleExpand(id);
      } else {
        setInternalExpandedId((prev) => (prev === id ? null : id));
      }
    },
    [onToggleExpand]
  );

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-50">
          <TableHead className="w-10 text-center">#</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Confidence</TableHead>
          <TableHead>Sources</TableHead>
          <TableHead className="w-20 text-center">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => {
          const isExpanded = expandedId === item.id;
          const dinner = isDinnerRow(item);

          return (
            <Fragment key={item.id}>
              <TableRow
                className={cn(getRowStyles(item), "transition-colors")}
              >
                <TableCell className="text-center text-xs text-gray-500">
                  {index + 1}
                </TableCell>

                <TableCell>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.vendor} &middot; {item.date}
                    </p>
                  </div>
                </TableCell>

                <TableCell className="text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(item.amount, item.currency)}
                  </span>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-900">
                      {item.category}
                    </span>
                    {item.original_category && (
                      <span className="text-xs text-gray-400 line-through">
                        {item.original_category}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <ConfidenceBadge confidence={item.confidence} />
                </TableCell>

                <TableCell>
                  <SourceIcons sources={item.sources} />
                </TableCell>

                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <PolicyStatusIcon status={item.policy_status} />
                    <button
                      type="button"
                      onClick={() => handleToggle(item.id)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Why?
                    </button>
                  </div>
                </TableCell>
              </TableRow>

              {/* Reasoning panel row */}
              {isExpanded && (
                <TableRow
                  key={`${item.id}-reasoning`}
                  className={cn(
                    "border-b",
                    dinner ? "bg-[#FEF3C7]/50" : "bg-gray-50/50"
                  )}
                >
                  <TableCell colSpan={7} className="px-4 py-3">
                    <ReasoningPanel
                      reasoning={item.reasoning}
                      sources={item.sources}
                      confidence={item.confidence}
                      category={item.category}
                      original_category={item.original_category}
                      policy_status={item.policy_status}
                      isExpanded={isExpanded}
                      onToggle={() => handleToggle(item.id)}
                      isHeroItem={dinner && dinnerPreExpanded}
                    />
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}

        {/* Missing / gap items */}
        {missingItems.map((missing, index) => (
          <TableRow
            key={missing.id}
            className="border border-dashed border-yellow-300 bg-[#FEF9C3]"
          >
            <TableCell className="text-center text-xs text-gray-500">
              {items.length + index + 1}
            </TableCell>

            <TableCell>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    {missing.detected_gap}
                  </p>
                  <p className="text-xs text-amber-600">
                    {missing.action_needed}
                  </p>
                </div>
              </div>
            </TableCell>

            <TableCell className="text-right">
              <span className="text-sm font-semibold text-amber-800">
                ~{formatCurrency(missing.estimated_amount, missing.currency)}
              </span>
            </TableCell>

            <TableCell>
              <span className="text-xs italic text-amber-600">
                Needs classification
              </span>
            </TableCell>

            <TableCell>
              <ConfidenceBadge confidence={missing.confidence} />
            </TableCell>

            <TableCell>
              <span className="text-xs text-amber-600">Gap detected</span>
            </TableCell>

            <TableCell className="text-center">
              <button
                type="button"
                className="rounded-md bg-amber-500 px-2 py-1 text-xs font-medium text-white hover:bg-amber-600"
              >
                Add
              </button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
