// Diagnostic temporaire : liste les événements gratuits et leurs détails
async function main() {
  const listRes = await fetch("http://localhost:3333/api/events?limit=50");
  const list = await listRes.json();
  const evs = list.data || [];
  console.log("Total events:", evs.length);

  for (const e of evs) {
    const tt = e.ticket_types || [];
    const free =
      tt.length > 0
        ? tt.every((t) => Number(t.price) <= 0)
        : Number(e.ticket_price || e.ticketPrice || 0) <= 0;
    if (free) {
      console.log("FREE id=" + e.id, JSON.stringify(e.title));
      const res = await fetch("http://localhost:3333/api/events/" + e.id);
      const det = await res.json();
      console.log(
        "   status=",
        res.status,
        "keys=",
        Object.keys(det).join(",")
      );
      if (res.status !== 200) {
        console.log("   ERROR BODY:", JSON.stringify(det).slice(0, 500));
      }
    }
  }
}
main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
