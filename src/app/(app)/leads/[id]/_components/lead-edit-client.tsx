"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateLead } from "@/actions/leads";
import { LeadFormBody } from "@/components/leads/new-lead-dialog";
import type { CreateLeadInput } from "@/lib/schemas/lead-schema";

type EmployeeOption = { id: string; name: string };

type Props = {
  leadId: string;
  defaultValues: Partial<CreateLeadInput> & {
    constructionTypes?: string[];
    city?: string;
  };
  employees: EmployeeOption[];
};

export function LeadEditClient({ leadId, defaultValues, employees }: Props) {
  const router = useRouter();
  const t = useTranslations("leads");

  async function handleSubmit(
    data: CreateLeadInput,
    constructionTypes: string[],
    city: string
  ) {
    const res = await updateLead(leadId, {
      ...data,
      constructionTypes,
      city: city || undefined,
    });
    if (res.success) {
      toast.success(t("detail.toastUpdated"));
      router.refresh();
    } else {
      toast.error(t("detail.toastError"));
    }
  }

  return (
    <LeadFormBody
      employees={employees}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      onCancel={() => router.push("/leads")}
      submitLabel={t("detail.saveChanges")}
    />
  );
}
