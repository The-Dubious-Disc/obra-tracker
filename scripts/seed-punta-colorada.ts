import { seedProject, ProjectData } from "../src/lib/services/projectSeeder";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

async function main() {
  const jsonPath = path.join(process.cwd(), "punta-colorada.json");
  
  if (!fs.existsSync(jsonPath)) {
    console.error("Error: punta-colorada.json not found in the root directory.");
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, "utf-8");
  const data: ProjectData = JSON.parse(rawData);

  console.log("Starting seeding of Punta Colorada project...");
  
  try {
    const project = await seedProject(data);
    console.log("Seeding completed successfully!");
    console.log(`Project ID: ${project.id}`);
  } catch (error) {
    console.error("Error during seeding:", error);
    process.exit(1);
  }
}

main();
