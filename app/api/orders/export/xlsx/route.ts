import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { exportRows, toXlsxBuffer } from "@/lib/exports";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const refs = searchParams.getAll("refs");
  const paymentStatus = searchParams.get("paymentStatus");
  const logisticsStatus = searchParams.get("logisticsStatus");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  let orders = await storage().getOrders();

  if (paymentStatus) {
    orders = orders.filter((order) => order.paymentStatus === paymentStatus);
  }

  if (logisticsStatus) {
    orders = orders.filter((order) => order.logisticsStatus === logisticsStatus);
  }

  if (dateFrom) {
    const from = new Date(dateFrom).getTime();
    orders = orders.filter((order) => new Date(order.createdAt).getTime() >= from);
  }

  if (dateTo) {
    const to = new Date(dateTo).getTime();
    orders = orders.filter((order) => new Date(order.createdAt).getTime() <= to);
  }

  if (refs.length > 0) {
    orders = orders.filter((order) => refs.includes(order.reference));
  } else {
    orders = orders.filter((order) => order.paymentStatus === "paid");
  }

  const rows = exportRows(orders);
  const buffer = toXlsxBuffer(rows);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="commandes-selection.xlsx"',
    },
  });
}