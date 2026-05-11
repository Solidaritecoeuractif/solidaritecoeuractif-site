import OrganizerAuthFormClient from "@/components/OrganizerAuthFormClient";

export default function Page() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "32px 16px",
        background:
          "linear-gradient(135deg, #f8fafc 0%, #eef2ff 45%, #fff7ed 100%)",
      }}
    >
      <OrganizerAuthFormClient mode="login" />
    </main>
  );
}