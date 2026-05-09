"use server";

import { db } from "@/lib/db";

export async function getClients() {
  return db.client.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { projects: true, invoices: true } },
      projects: { select: { contractValue: true, status: true } },
      invoices: { select: { total: true, paidAmount: true } },
    },
  });
}

export async function getClientById(id: string) {
  return db.client.findUnique({
    where: { id },
    include: {
      leads: {
        select: { id: true, name: true, createdAt: true, status: true, source: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      projects: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          status: true,
          contractValue: true,
          progressPercent: true,
          startDate: true,
          endDate: true,
          address: true,
          createdAt: true,
        },
      },
      quotes: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          quoteNumber: true,
          date: true,
          validUntil: true,
          status: true,
          total: true,
          createdAt: true,
        },
      },
      invoices: {
        orderBy: { date: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          date: true,
          dueDate: true,
          status: true,
          total: true,
          paidAmount: true,
          createdAt: true,
        },
      },
    },
  });
}
