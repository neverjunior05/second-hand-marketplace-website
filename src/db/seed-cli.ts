/**
 * CLI entry for `npm run seed`.
 * Loads .env before importing the Drizzle client (which reads DATABASE_URL).
 */
import "dotenv/config";

async function main() {
  const { runSeed } = await import("../db/seed");
  const result = await runSeed();
  console.log("✅ Bindery seeded:", result);
  console.log("   admin@bindery.test / Admin@123");
  console.log("   priya@bindery.test / Password@123  (seller + buyer demo)");
  console.log("   rahul@bindery.test / Password@123  (buyer demo)");
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
