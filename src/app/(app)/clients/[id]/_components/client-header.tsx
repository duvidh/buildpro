"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { HardDeleteDialog } from "@/components/ui/hard-delete-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateClient, deleteClient } from "@/actions/clients";
import { buildClientSchema, type ClientInput } from "@/lib/schemas/client-schema";

type Client = {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  phone2?: string | null;
  email?: string | null;
  address?: string | null;
  companyNumber?: string | null;
  notes?: string | null;
};

function getInitials(name: string) {
  return name.trim().split(" ").slice(0, 2).map((w) => w[0]).join("");
}

export function ClientHeader({
  client,
  canDelete = false,
}: {
  client: Client;
  /** Whether the current user may delete this client (ADMIN / OFFICE_MANAGER). */
  canDelete?: boolean;
}) {
  const t       = useTranslations("clients");
  const tCommon = useTranslations("common");
  const router  = useRouter();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSaving, startSave] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  const schema = useMemo(
    () => buildClientSchema({
      nameTooShort: t("validation.nameTooShort"),
      invalidEmail: t("validation.invalidEmail"),
    }),
    [t]
  );

  const form = useForm<ClientInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:          client.name,
      contactName:   client.contactName  ?? "",
      phone:         client.phone        ?? "",
      phone2:        client.phone2       ?? "",
      email:         client.email        ?? "",
      address:       client.address      ?? "",
      companyNumber: client.companyNumber ?? "",
      notes:         client.notes        ?? "",
    },
  });

  function handleSave(data: ClientInput) {
    startSave(async () => {
      const res = await updateClient(client.id, data);
      if (res.success) {
        toast.success(t("header.toastUpdated"));
        setShowEditDialog(false);
        router.refresh();
      } else {
        toast.error(t("header.toastUpdateError"));
      }
    });
  }

  function handleDelete() {
    startDelete(async () => {
      const res = await deleteClient(client.id);
      if (res.success) {
        toast.success(t("header.toastDeleted"));
        router.push("/clients");
      } else {
        toast.error(t("header.toastDeleteError"));
        setShowDeleteDialog(false);
      }
    });
  }

  // Shorthand for dynamic form field keys
  const tf = (k: string) => t(k as Parameters<typeof t>[0]);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        {/* ── Start: back + identity ── */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button */}
          <Link
            href="/clients"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>

          {/* Avatar initials */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
            {getInitials(client.name)}
          </div>

          {/* Name + contact info */}
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground leading-tight truncate">
              {client.name}
            </h1>
            {client.contactName && (
              <p className="text-xs text-muted-foreground truncate">
                {client.contactName}
              </p>
            )}
          </div>
        </div>

        {/* ── End: contact links + actions ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Contact info row */}
          <div className="hidden sm:flex items-center gap-3">
            {client.phone && (
              <a
                href={`tel:${client.phone}`}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                dir="ltr"
              >
                <Phone className="h-3.5 w-3.5" />
                {client.phone}
              </a>
            )}
            {client.phone2 && (
              <a
                href={`tel:${client.phone2}`}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                dir="ltr"
              >
                <Phone className="h-3.5 w-3.5" />
                {client.phone2}
              </a>
            )}
            {client.email && (
              <a
                href={`mailto:${client.email}`}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                dir="ltr"
              >
                <Mail className="h-3.5 w-3.5" />
                {client.email}
              </a>
            )}
            {client.address && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {client.address}
              </span>
            )}
          </div>

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                <Pencil className="h-4 w-4 me-2" />
                {t("header.editClient")}
              </DropdownMenuItem>
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 me-2" />
                    {t("header.deleteClient")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Edit Dialog ── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("header.editTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="edit-name">
                  {tf("form.fields.name")} <span className="text-destructive">*</span>
                </Label>
                <Input id="edit-name" {...form.register("name")} className="mt-1" />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="edit-contactName">{tf("form.fields.contactName")}</Label>
                <Input id="edit-contactName" {...form.register("contactName")} className="mt-1" />
              </div>

              <div>
                <Label htmlFor="edit-companyNumber">{tf("form.fields.companyNumber")}</Label>
                <Input id="edit-companyNumber" {...form.register("companyNumber")} className="mt-1" dir="ltr" />
              </div>

              <div>
                <Label htmlFor="edit-phone">{tf("form.fields.phone")}</Label>
                <Input id="edit-phone" type="tel" {...form.register("phone")} className="mt-1" dir="ltr" />
              </div>

              <div>
                <Label htmlFor="edit-phone2">{tf("form.fields.phone2Short")}</Label>
                <Input id="edit-phone2" type="tel" {...form.register("phone2")} className="mt-1" dir="ltr" />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="edit-email">{tf("form.fields.email")}</Label>
                <Input id="edit-email" type="email" {...form.register("email")} className="mt-1" dir="ltr" />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="edit-address">{tf("form.fields.address")}</Label>
                <Input id="edit-address" {...form.register("address")} className="mt-1" />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="edit-notes">{tf("form.fields.notes")}</Label>
                <Textarea id="edit-notes" {...form.register("notes")} className="mt-1" rows={3} />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowEditDialog(false)}
                disabled={isSaving}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
                {tCommon("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <HardDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        itemName={client.name}
        itemKind={t("header.deleteItemKind")}
        cascadeList={[
          t("header.cascade.projects"),
          t("header.cascade.invoices"),
          t("header.cascade.quotes"),
          t("header.cascade.files"),
          t("header.cascade.tasks"),
        ]}
        onConfirm={handleDelete}
        isPending={isDeleting}
      />
    </>
  );
}
