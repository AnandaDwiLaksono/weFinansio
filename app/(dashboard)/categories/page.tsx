"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useApiQuery, useApiMutation, api } from "@/lib/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

type Cat = { id: string; name: string; kind: "expense"|"income"; color: string|null; icon: string|null };

export default function CategoriesPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useApiQuery<{items: Cat[]}>(
    ["categories"],
    () => api.get("/api/categories"),
    // { staleTime: 10_000 }
  );
  const items = data?.items ?? [];
  const expense = items.filter(c => c.kind==="expense");
  const income  = items.filter(c => c.kind==="income");

  // Create
  const [form, setForm] = useState<{name:string; kind:"expense"|"income"; color?:string; icon?:string}>({ name:"", kind:"expense" });
  const createMut = useApiMutation<{id:string}, typeof form>(
    (v) => api.post("/api/categories", v),
    { toastSuccess: "Kategori ditambahkan", onSuccess: ()=> qc.invalidateQueries({ queryKey:["categories"] }) }
  );

  // Update (rename/color/icon)
  const updateMut = useApiMutation<{ok:true}, {id:string; name?:string; color?:string; icon?:string}>(
    (v) => api.patch(`/api/categories/${v.id}`, { name:v.name, color:v.color, icon:v.icon }),
    { toastSuccess: "Kategori diperbarui", onSuccess: ()=> qc.invalidateQueries({ queryKey:["categories"] }) }
  );

  // Delete (opsi mergeTo)
  const deleteMut = useApiMutation<{ok:true}, {id:string; mergeTo?:string}>(
    (v) => {
      const url = v.mergeTo 
        ? `/api/categories/${v.id}?mergeTo=${encodeURIComponent(v.mergeTo)}`
        : `/api/categories/${v.id}`;
      return api.del(url);
    },
    { toastSuccess: "Kategori dihapus", onSuccess: ()=> qc.invalidateQueries({ queryKey:["categories"] }) }
  );

  const [rename, setRename] = useState<Record<string, string>>({});
  const [merge, setMerge] = useState<Record<string, string>>({});

  if (isLoading) return <div className="p-6">Memuat kategori…</div>;
  if (error) return <div className="p-6 text-red-500">Gagal memuat</div>;

  return (
    <main className="p-4 md:p-6 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Kategori</h1>
          <p className="text-sm text-muted-foreground">Kelola kategori pemasukan & pengeluaran</p>
        </div>
      </header>

      {/* Form Tambah */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Tambah Kategori</h3>
          <div className="grid sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <Label>Nama</Label>
              <Input value={form.name} onChange={(e)=>setForm(f=>({...f, name:e.target.value}))} placeholder="Contoh: Makan & Minum" />
            </div>
            <div>
              <Label>Jenis</Label>
              <Select value={form.kind} onValueChange={(v)=>setForm(f=>({...f, kind: v as "expense" | "income"}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Pengeluaran</SelectItem>
                  <SelectItem value="income">Pemasukan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={()=>createMut.mutate(form)} disabled={!form.name}>Tambah</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daftar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoryList
          title="Pengeluaran"
          items={expense}
          rename={rename}
          setRename={setRename}
          merge={merge}
          setMerge={setMerge}
          update={(id, payload)=> updateMut.mutate({ id, ...payload })}
          remove={(id, mergeTo)=> deleteMut.mutate({ id, mergeTo })}
          all={items}
        />
        <CategoryList
          title="Pemasukan"
          items={income}
          rename={rename}
          setRename={setRename}
          merge={merge}
          setMerge={setMerge}
          update={(id, payload)=> updateMut.mutate({ id, ...payload })}
          remove={(id, mergeTo)=> deleteMut.mutate({ id, mergeTo })}
          all={items}
        />
      </div>
    </main>
  );
}

function CategoryList({
  title, items, all,
  rename, setRename,
  merge, setMerge,
  update, remove
}: {
  title: string;
  items: Cat[];
  all: Cat[];
  rename: Record<string,string>;
  setRename: (f: (prev: Record<string,string>) => Record<string,string>)=>void;
  merge: Record<string,string>;
  setMerge: (f: (prev: Record<string,string>) => Record<string,string>)=>void;
  update: (id:string, payload: {name?:string; color?:string; icon?:string})=>void;
  remove: (id:string, mergeTo?:string)=>void;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <h3 className="font-semibold mb-3">{title}</h3>
        <ul className="space-y-3">
          {items.map(c => (
            <li key={c.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground">ID: {c.id.slice(0,8)}…</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={()=>{
                    setRename((r: Record<string, string>)=> ({ ...r, [c.id]: c.name }));
                  }}>Ubah</Button>
                  <Button variant="destructive" size="sm" onClick={()=>{
                    setMerge((m: Record<string, string>)=> ({ ...m, [c.id]: "" }));
                  }}>Hapus</Button>
                </div>
              </div>

              {/* Inline rename */}
              {rename[c.id] !== undefined && (
                <div className="mt-3 grid sm:grid-cols-3 gap-2">
                  <Input value={rename[c.id] ?? ""} onChange={(e)=> setRename((r:Record<string, string>)=>({...r, [c.id]: e.target.value}))} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={()=>{ update(c.id, { name: rename[c.id] }); setRename((r:Record<string, string>)=>{ const { [c.id]:_, ...rest }=r; return rest; }); }}>Simpan</Button>
                    <Button size="sm" variant="ghost" onClick={()=> setRename((r:Record<string, string>)=>{ const { [c.id]:_, ...rest }=r; return rest; })}>Batal</Button>
                  </div>
                </div>
              )}

              {/* Delete with mergeTo */}
              {merge[c.id] !== undefined && (
                <div className="mt-3 grid sm:grid-cols-3 gap-2 items-end">
                  <div className="sm:col-span-2">
                    <Label>Pindahkan transaksi ke:</Label>
                    <Select value={merge[c.id] ?? ""} onValueChange={(v)=> setMerge((m:Record<string, string>)=> ({ ...m, [c.id]: v }))}>
                      <SelectTrigger><SelectValue placeholder="Pilih kategori (opsional)" /></SelectTrigger>
                      <SelectContent>
                        {all.filter(x => x.id !== c.id && x.kind === c.kind).map(x => (
                          <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" onClick={()=>{
                      remove(c.id, merge[c.id] || undefined);
                      setMerge((m:Record<string, string>)=>{ const { [c.id]:_, ...rest }=m; return rest; });
                    }}>Hapus</Button>
                    <Button size="sm" variant="ghost" onClick={()=> setMerge((m:Record<string, string>)=>{ const { [c.id]:_, ...rest }=m; return rest; })}>Batal</Button>
                  </div>
                </div>
              )}
            </li>
          ))}
          {items.length === 0 && <li className="text-sm text-muted-foreground">Belum ada kategori.</li>}
        </ul>
      </CardContent>
    </Card>
  );
}
