import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createUser, deleteUser, fetchUsers, toggleUserStatus, updateUserRole } from "@/api/admin";
import { ApiError } from "@/api/client";
import { AppShell } from "@/components/AppShell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { AppUser, NewUserPayload, Role } from "@/types";

const ROLE_LABELS: Record<Role, string> = {
  infirmier: "Infirmier",
  medecin: "Médecin",
  admin: "Administrateur",
};

const EMPTY: NewUserPayload = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  role: "infirmier",
};

export function AdminPage() {
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewUserPayload>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<AppUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);

  function errorMessage(err: unknown, fallback: string) {
    return err instanceof ApiError ? err.message : fallback;
  }

  async function submit() {
    setSaving(true);
    try {
      const created = await createUser(form);
      setUsers((u) => [...(u ?? []), created]);
      setForm(EMPTY);
      setOpen(false);
    } catch (err) {
      toast.error(errorMessage(err, "Impossible de créer ce compte."));
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(user: AppUser, role: Role) {
    const previous = user.role;
    setUsers((u) => (u ?? []).map((x) => (x.id === user.id ? { ...x, role } : x)));
    try {
      await updateUserRole(user.id, role);
    } catch (err) {
      setUsers((u) => (u ?? []).map((x) => (x.id === user.id ? { ...x, role: previous } : x)));
      toast.error(errorMessage(err, "Impossible de changer le rôle."));
    }
  }

  async function toggle(user: AppUser, active: boolean) {
    setUsers((u) => (u ?? []).map((x) => (x.id === user.id ? { ...x, active } : x)));
    try {
      await toggleUserStatus(user.id, active);
    } catch (err) {
      setUsers((u) => (u ?? []).map((x) => (x.id === user.id ? { ...x, active: !active } : x)));
      toast.error(errorMessage(err, "Impossible de changer le statut."));
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteUser(toDelete.id);
      setUsers((u) => (u ?? []).filter((x) => x.id !== toDelete.id));
      toast.success(`Compte de ${toDelete.fullName} supprimé`);
      setToDelete(null);
    } catch (err) {
      toast.error(errorMessage(err, "Impossible de supprimer ce compte."));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppShell
      allow={["admin"]}
      title="Gestion des utilisateurs"
      subtitle="Comptes du service — aucune donnée patient n'est accessible depuis cet espace"
    >
      <Card className="rounded-xl border-border p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{users?.length ?? 0} comptes</p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Créer un utilisateur
          </Button>
        </div>

        <div className="mt-6 overflow-x-auto">
          {!users ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="py-2.5 pr-4">Nom</th>
                  <th className="py-2.5 pr-4">Email</th>
                  <th className="py-2.5 pr-4">Rôle</th>
                  <th className="py-2.5 pr-4">Statut</th>
                  <th className="py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 font-medium text-foreground">{u.fullName}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{u.email}</td>
                    <td className="py-3 pr-4">
                      <Select value={u.role} onValueChange={(v) => changeRole(u, v as Role)}>
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {u.active ? "Actif" : "Inactif"}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <Switch checked={u.active} onCheckedChange={(v) => toggle(u, v)} />
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Supprimer ${u.fullName}`}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setToDelete(u)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un utilisateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Prénom</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nom</Label>
                <Input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mot de passe temporaire</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rôle</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as Role })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={submit} disabled={saving || !form.email.trim()}>
              {saving ? "Création…" : "Créer le compte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte de {toDelete?.fullName} ({toDelete?.email}) sera définitivement supprimé.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
