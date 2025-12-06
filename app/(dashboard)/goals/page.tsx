"use client";

import { useState } from "react";

import { useApiQuery, useApiMutation, api } from "@/lib/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, PiggyBank } from "lucide-react";
import AddGoalModal from "@/components/AddGoalModal";
import EditGoalModal from "@/components/EditGoalModal";
import GoalContributionModal from "@/components/GoalContributionModal";
import { Badge } from "@/components/ui/badge";

type Goal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  progress: number;
  remaining: number;
  targetDate?: string | null;
  linkedAccountId?: string | null;
  color?: string | null;
  icon?: string | null;
};

export default function GoalsPage(){
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all"|"ontrack"|"almost"|"completed"|"overdue">("all");

  const { data, refetch } = useApiQuery<{items: Goal[]}>(
    ["goals", q],
    () => api.get("/api/goals?" + new URLSearchParams({ q })),
    { staleTime: 10_000 }
  );

  const { data: accsData } = useApiQuery<{items:{id:string; name:string}[]}>(
    ["accounts-list"],
    () => api.get("/api/accounts"),
    { staleTime: 60_000 }
  );

  const del = useApiMutation<{ok: true}, {id: string}>(
    ({id}) => api.del(`/api/goals/${id}`),
    { onSuccess: ()=> refetch() }
  );

  const rawItems = data?.items ?? [];
  const accountsMap = new Map((accsData?.items ?? []).map(a => [a.id, a.name]));

  const items = rawItems.filter(g => {
    const today = new Date();
    const pct = g.progress || 0;
    const hasTargetDate = !!g.targetDate;
    const targetDate = hasTargetDate ? new Date(g.targetDate!) : null;
    const isOverdue = hasTargetDate && pct < 1 && targetDate! < today;

    switch (statusFilter) {
      case "completed":
        return pct >= 1;
      case "almost":
        return pct >= 0.8 && pct < 1;
      case "ontrack":
        return pct > 0 && pct < 0.8 && !isOverdue;
      case "overdue":
        return isOverdue;
      default:
        return true;
    }
  });

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Goals</h1>
          <p className="text-sm text-muted-foreground">Pantau progres tujuan finansialmu</p>
        </div>
        <div className="hidden md:block">
          <AddGoalModal onSaved={refetch} />
        </div>
      </div>

      {/* filter bar */}
      <Card>
        <CardContent className="p-4 flex gap-2 items-center">
          <Input placeholder="Cari goal…" value={q} onChange={(e)=> setQ(e.target.value)} className="w-64" />
          <div className="flex flex-wrap gap-2">
            <FilterChip label="Semua" value="all" status={statusFilter} onChange={setStatusFilter} />
            <FilterChip label="On track" value="ontrack" status={statusFilter} onChange={setStatusFilter} />
            <FilterChip label="Hampir tercapai" value="almost" status={statusFilter} onChange={setStatusFilter} />
            <FilterChip label="Selesai" value="completed" status={statusFilter} onChange={setStatusFilter} />
            <FilterChip label="Overdue" value="overdue" status={statusFilter} onChange={setStatusFilter} />
          </div>
          <Button variant="outline" onClick={()=> setQ("")}>Reset</Button>
          <AddGoalModal onSaved={refetch} className="md:hidden ml-auto" />
        </CardContent>
      </Card>

      {/* grid cards seperti sebelumnya, tapi tambahkan badge status */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(g => {
          const tag = getGoalStatus(g);
          const linkedAccName = g.linkedAccountId ? accountsMap.get(g.linkedAccountId) : null;
          return (
            <Card key={g.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between gap-3">
                  <span className="truncate flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded" style={{ background: g.color || "#3b82f6" }} />
                    {g.name}
                  </span>
                  <div className="flex flex-col items-end gap-1">
                    {g.targetDate && <span className="text-xs text-muted-foreground">{fmtDate(g.targetDate)}</span>}
                    <Badge variant={tag.variant} className="text-[10px] px-2 py-0">
                      {tag.label}
                    </Badge>
                  </div>
                </CardTitle>
                {linkedAccName && (
                  <p className="text-xs text-muted-foreground mt-1">
                    🔗 Auto dari: <strong>{linkedAccName}</strong>
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Ring progress={g.progress} />
                  <div className="text-sm">
                    <div>Terkumpul: <strong>{rupiah(g.saved)}</strong></div>
                    <div>Target: <strong>{rupiah(g.target)}</strong></div>
                    <div className="text-muted-foreground">Sisa: {rupiah(g.remaining)}</div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <GoalContributionModal goalId={g.id} onSaved={refetch}>
                    <Button variant="secondary" size="sm"><PiggyBank className="h-4 w-4 mr-1" />Tambah</Button>
                  </GoalContributionModal>
                  <EditGoalModal id={g.id} initial={g} onSaved={refetch}>
                    <Button variant="outline" size="icon" aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                  </EditGoalModal>
                  <Button variant="destructive" size="icon" aria-label="Hapus" onClick={()=> del.mutate({ id: g.id })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {items.length===0 && (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Belum ada goal. Tambahkan dulu.</CardContent></Card>
      )}
    </div>
  );
}

function fmtDate(s?: string|null){ return s ? new Date(s).toLocaleDateString("id-ID") : ""; }
function rupiah(n:number){ return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n||0); }

// Ring progress (conic-gradient, ringan)
function Ring({ progress }: { progress: number }) {
  const pct = Math.round((progress || 0) * 100);
  return (
    <div className="relative h-16 w-16">
      <div
        className="h-16 w-16 rounded-full"
        style={{ background: `conic-gradient(#16a34a ${pct}%, #e5e7eb ${pct}%)` }}
      />
      <div className="absolute inset-2 bg-background rounded-full grid place-items-center text-xs font-medium">{pct}%</div>
    </div>
  );
}

function FilterChip({
  label, value, status, onChange,
}: { label:string; value:"all"|"ontrack"|"almost"|"completed"|"overdue"; status:"all"|"ontrack"|"almost"|"completed"|"overdue"; onChange:(v:"all"|"ontrack"|"almost"|"completed"|"overdue")=>void }) {
  const active = status === value;
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={()=> onChange(value)}
    >
      {label}
    </Button>
  );
}

function getGoalStatus(g: Goal): { label:string; variant:"default"|"secondary"|"destructive" } {
  const pct = g.progress || 0;
  const today = new Date();
  const hasTarget = !!g.targetDate;
  const targetDate = hasTarget ? new Date(g.targetDate!) : null;
  const isOverdue = hasTarget && pct < 1 && targetDate! < today;

  if (pct >= 1) return { label:"Selesai", variant:"default" };
  if (isOverdue) return { label:"Overdue", variant:"destructive" };
  if (pct >= 0.8) return { label:"Hampir tercapai", variant:"default" };
  if (pct > 0) return { label:"On track", variant:"secondary" };
  return { label:"Belum mulai", variant:"secondary" };
}
