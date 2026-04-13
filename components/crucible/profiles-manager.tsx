"use client";

import { useEffect, useState } from "react";

import { WeightBars } from "@/components/crucible/weight-bars";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_ENGINE_WEIGHTS } from "@/lib/crucible/constants";
import { ENGINE_WEIGHT_KEYS, type EngineWeights } from "@/lib/crucible/types";

import { Lock, Pencil, Plus, Trash2 } from "lucide-react";

type Profile = {
  id: string;
  name: string;
  description: string | null;
  engine_weights: EngineWeights;
  is_system_profile: boolean;
};

export function ProfilesManager() {
  const [system, setSystem] = useState<Profile[]>([]);
  const [custom, setCustom] = useState<Profile[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [weights, setWeights] = useState<EngineWeights>({ ...DEFAULT_ENGINE_WEIGHTS });

  async function load() {
    const res = await fetch("/api/crucible/profiles");
    if (!res.ok) return;
    const j = (await res.json()) as { system: Profile[]; custom: Profile[] };
    setSystem(j.system ?? []);
    setCustom(j.custom ?? []);
  }

  useEffect(() => {
    queueMicrotask(() => void load());
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setWeights({ ...DEFAULT_ENGINE_WEIGHTS });
    setOpen(true);
  }

  function openEdit(p: Profile) {
    setEditing(p);
    setName(p.name);
    setDescription(p.description ?? "");
    setWeights({ ...DEFAULT_ENGINE_WEIGHTS, ...p.engine_weights });
    setOpen(true);
  }

  async function save() {
    if (editing) {
      await fetch(`/api/crucible/profiles/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, engine_weights: weights }),
      });
    } else {
      await fetch("/api/crucible/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, engine_weights: weights }),
      });
    }
    setOpen(false);
    void load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this profile?")) return;
    await fetch(`/api/crucible/profiles/${id}`, { method: "DELETE" });
    void load();
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight">Profiles</h1>
          <p className="text-sm text-muted-foreground">System presets and your custom engine profiles.</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-500" onClick={openCreate}>
          <Plus className="mr-1 size-4" />
          Create profile
        </Button>
      </header>

      <section>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          System profiles
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {system.map((p) => (
            <Card key={p.id} className="border-white/10 bg-[#0f1117]">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lock className="size-4 text-muted-foreground" />
                    {p.name}
                  </CardTitle>
                  {p.description ? (
                    <CardDescription className="mt-1">{p.description}</CardDescription>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <WeightBars weights={p.engine_weights} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Custom profiles
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {custom.map((p) => (
            <Card key={p.id} className="border-white/10 bg-[#0f1117]">
              <CardHeader>
                <CardTitle className="text-base">{p.name}</CardTitle>
                {p.description ? <CardDescription>{p.description}</CardDescription> : null}
              </CardHeader>
              <CardContent className="space-y-3">
                <WeightBars weights={p.engine_weights} />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-white/10" onClick={() => openEdit(p)}>
                    <Pencil className="mr-1 size-3" />
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => void remove(p.id)}>
                    <Trash2 className="mr-1 size-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#0f1117] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit profile" : "Create profile"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="border-white/10" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border-white/10"
              />
            </div>
            {ENGINE_WEIGHT_KEYS.map((key) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-xs font-mono text-muted-foreground">
                  <span>{key}</span>
                  <span>{(weights[key] ?? 0).toFixed(2)}</span>
                </div>
                <Slider
                  value={[weights[key] ?? 0]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={(v) => {
                    const n = Array.isArray(v) ? (v[0] ?? 0) : v;
                    setWeights((prev) => ({ ...prev, [key]: n }));
                  }}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-white/10" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-500" onClick={() => void save()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
