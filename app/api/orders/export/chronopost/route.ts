import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { chronopostRows, toSemicolonCsv } from "@/lib/exports";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const refs = searchParams.getAll("refs");
  const paymentStatus = searchParams.get("paymentStatus");
  const logisticsStatus = searchParams.get("logisticsStatus");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const [allOrders, products] = await Promise.all([
    storage().getOrders(),
    storage().getProducts(),
  ]);

  let orders = allOrders;

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

  orders = orders.filter((order) => order.shippingAddress);

  const rows = chronopostRows(orders, products);
  const csv = toSemicolonCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="chronopost-export.csv"',
      "Cache-Control": "private, max-age=300",
    },
  });
}