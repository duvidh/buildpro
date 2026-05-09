"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Loader2,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  seedCatalogItems,
} from "@/actions/catalog";
import { catalogItemSchema, type CatalogItemInput } from "@/lib/schemas/catalog-schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type CatalogItem = {
  id: string;
  name: string;
  unit: string;
  unitCost: number;
  category: string | null;
  description: string | null;
};

type Props = {
  initialItems: CatalogItem[];
};

// ─── Item dialog ──────────────────────────────────────────────────────────────

function ItemDialog({
  trigger,
  title,
  defaultValues,
  onSubmit,
}: {
  trigger: React.ReactNode;
  title: string;
  defaultValues?: Partial<CatalogItemInput>;
  onSubmit: (data: CatalogItemInput) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CatalogItemInput>({
    resolver: zodResolver(catalogItemSchema),
    defaultValues: { unit: "יח'", ...defaultValues },
  });

  function submit(data: CatalogItemInput) {
    startTransition(async () => {
      await onSubmit(data);
      setOpen(false);
      reset();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">שם פריט *</Label>
            <Input id="name" {...register("name")} placeholder="ריצוף גרניט 60×60" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unit">יחידה *</Label>
              <Input id="unit" {...register("unit")} placeholder='מ"ר' />
              {errors.unit && <p className="text-xs text-destructive">{errors.unit.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unitCost">עלות ליחידה (₪)</Label>
              <Input id="unitCost" type="number" min={0} step="any" {...register("unitCost")} placeholder="0" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">קטגוריה</Label>
            <Input id="category" {...register("category")} placeholder="ריצוף, עבודה, חומרים..." />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">תיאור</Label>
            <Textarea id="description" rows={2} {...register("description")} placeholder="תיאור קצר..." />
          </div>

          <Button type="submit" disabled={isPending} className="self-end">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "שמור"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CatalogManager({ initialItems }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSeed() {
    startTransition(async () => {
      await seedCatalogItems();
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteCatalogItem(id);
      router.refresh();
    });
  }

  // group by category
  const categories = Array.from(
    new Set(initialItems.map((i) => i.category ?? "כללי"))
  ).sort();

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">קטלוג מוצרים ושירותים</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {initialItems.length} פריטים פעילים
          </p>
        </div>
        <div className="flex gap-2">
          {initialItems.length === 0 && (
            <Button variant="outline" onClick={handleSeed} disabled={isPending} className="gap-2">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              טען נתוני דמו
            </Button>
          )}
          <ItemDialog
            trigger={
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                פריט חדש
              </Button>
            }
            title="פריט חדש"
            onSubmit={async (data) => {
              await createCatalogItem(data);
              router.refresh();
            }}
          />
        </div>
      </div>

      {/* Empty state */}
      {initialItems.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center text-muted-foreground">
          <Package className="h-12 w-12 opacity-30" />
          <p className="text-sm">הקטלוג ריק — הוסף פריטים ידנית או טען נתוני דמו</p>
        </div>
      )}

      {/* Table per category */}
      {categories.map((cat) => {
        const catItems = initialItems.filter((i) => (i.category ?? "כללי") === cat);
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">{cat}</Badge>
              <span className="text-xs text-muted-foreground">{catItems.length} פריטים</span>
            </div>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>שם פריט</TableHead>
                    <TableHead className="w-20 text-center">יחידה</TableHead>
                    <TableHead className="w-28 text-center">עלות ליח&apos;</TableHead>
                    <TableHead>תיאור</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{item.unit}</TableCell>
                      <TableCell className="text-center">
                        ₪{item.unitCost.toLocaleString("he-IL", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.description ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <ItemDialog
                            trigger={
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            }
                            title="עריכת פריט"
                            defaultValues={{
                              name: item.name,
                              unit: item.unit,
                              unitCost: String(item.unitCost),
                              category: item.category ?? "",
                              description: item.description ?? "",
                            }}
                            onSubmit={async (data) => {
                              await updateCatalogItem(item.id, data);
                              router.refresh();
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(item.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
