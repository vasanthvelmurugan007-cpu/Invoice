"use server";

import { db } from "../../db";
import { hsnMaster } from "../../db/schema";
import { or, ilike, eq } from "drizzle-orm";

// 50 common HSN/SAC codes relevant to Indian SMBs
const COMMON_CODES = [
  { code: "7208", description: "Flat-rolled products of iron or non-alloy steel (1.2m+ width)", gstRate: 1800, type: "HSN" as const },
  { code: "4901", description: "Printed books, brochures, leaflets and similar printed matter", gstRate: 1200, type: "HSN" as const },
  { code: "8504", description: "Electrical transformers, static converters and inductors", gstRate: 1800, type: "HSN" as const },
  { code: "9973", description: "Licensing services for the right to use computer software", gstRate: 1800, type: "SAC" as const },
  { code: "9983", description: "Other professional, technical and business services (Consulting)", gstRate: 1800, type: "SAC" as const },
  { code: "9964", description: "Passenger transport services (Cab / Flight / Bus)", gstRate: 500, type: "SAC" as const },
  { code: "9963", description: "Food, beverage and lodging services (Restaurant / Hotel)", gstRate: 500, type: "SAC" as const },
  { code: "6109", description: "T-shirts, singlets and other vests, knitted or crocheted", gstRate: 1200, type: "HSN" as const },
  { code: "8473", description: "Parts and accessories suitable for machines / computer components", gstRate: 1800, type: "HSN" as const },
  { code: "2106", description: "Food preparations not elsewhere specified (Namkeen, Packaged Food)", gstRate: 1800, type: "HSN" as const },
  { code: "9987", description: "Maintenance, repair and installation (except construction) services", gstRate: 1800, type: "SAC" as const },
  { code: "7308", description: "Structures and parts of structures of iron or steel", gstRate: 1800, type: "HSN" as const },
  { code: "4820", description: "Registers, account books, notebooks, order books, receipt books", gstRate: 1800, type: "HSN" as const },
  { code: "8517", description: "Telephone sets, including smartphones and other communication devices", gstRate: 1800, type: "HSN" as const },
  { code: "6203", description: "Men's or boys' suits, ensembles, jackets, trousers, bib overalls", gstRate: 1200, type: "HSN" as const },
  { code: "3004", description: "Medicaments consisting of mixed or unmixed products for therapeutic uses", gstRate: 1200, type: "HSN" as const },
  { code: "3923", description: "Articles for the conveyance or packing of goods, of plastics", gstRate: 1800, type: "HSN" as const },
  { code: "9984", description: "Telecommunications, broadcasting and information supply services", gstRate: 1800, type: "SAC" as const },
  { code: "9982", description: "Legal and accounting services", gstRate: 1800, type: "SAC" as const },
  { code: "9954", description: "Construction services", gstRate: 1800, type: "SAC" as const },
  { code: "8471", description: "Automatic data processing machines and units (Computers, Laptops)", gstRate: 1800, type: "HSN" as const },
  { code: "8528", description: "Monitors and projectors, reception apparatus for television", gstRate: 2800, type: "HSN" as const },
  { code: "8708", description: "Parts and accessories of motor vehicles", gstRate: 2800, type: "HSN" as const },
  { code: "6403", description: "Footwear with outer soles of rubber, plastics, leather", gstRate: 1200, type: "HSN" as const },
  { code: "0902", description: "Tea, whether or not flavored", gstRate: 500, type: "HSN" as const },
  { code: "0901", description: "Coffee, whether or not roasted or decaffeinated", gstRate: 500, type: "HSN" as const },
  { code: "1701", description: "Cane or beet sugar and chemically pure sucrose, in solid form", gstRate: 500, type: "HSN" as const },
  { code: "2201", description: "Waters, including natural or artificial mineral waters, not sweetened", gstRate: 1800, type: "HSN" as const },
  { code: "3304", description: "Beauty or make-up preparations and preparations for the care of skin", gstRate: 1800, type: "HSN" as const },
  { code: "3401", description: "Soap; organic surface-active products and preparations for use as soap", gstRate: 1800, type: "HSN" as const },
  { code: "9403", description: "Other furniture and parts thereof", gstRate: 1800, type: "HSN" as const },
  { code: "9965", description: "Land transport services of goods (GTAs / Logistics)", gstRate: 500, type: "SAC" as const },
  { code: "9967", description: "Supporting and auxiliary transport services; travel agencies", gstRate: 1800, type: "SAC" as const },
  { code: "9971", description: "Financial and related services", gstRate: 1800, type: "SAC" as const },
  { code: "9972", description: "Real estate services", gstRate: 1800, type: "SAC" as const },
  { code: "9981", description: "Research and development services", gstRate: 1800, type: "SAC" as const },
  { code: "9985", description: "Support services (Office admin, personnel, security)", gstRate: 1800, type: "SAC" as const },
  { code: "9988", description: "Manufacturing services on physical inputs owned by others (Job work)", gstRate: 1200, type: "SAC" as const },
  { code: "9992", description: "Education services", gstRate: 1800, type: "SAC" as const },
  { code: "9993", description: "Human health and social care services", gstRate: 1800, type: "SAC" as const },
  { code: "6907", description: "Ceramic flags and paving, hearth or wall tiles", gstRate: 1800, type: "HSN" as const },
  { code: "7007", description: "Safety glass, consisting of toughened or laminated glass", gstRate: 1800, type: "HSN" as const },
  { code: "7604", description: "Aluminum bars, rods and profiles", gstRate: 1800, type: "HSN" as const },
  { code: "8207", description: "Interchangeable tools for hand tools, whether or not power-operated", gstRate: 1800, type: "HSN" as const },
  { code: "8413", description: "Pumps for liquids, whether or not fitted with a measuring device", gstRate: 1200, type: "HSN" as const },
  { code: "8481", description: "Taps, cocks, valves and similar appliances for pipes, boiler shells", gstRate: 1800, type: "HSN" as const },
  { code: "8507", description: "Electric accumulators, including separators therefor (Batteries)", gstRate: 2800, type: "HSN" as const },
  { code: "8536", description: "Electrical apparatus for switching or protecting electrical circuits", gstRate: 1800, type: "HSN" as const },
  { code: "9018", description: "Instruments and appliances used in medical, surgical, dental sciences", gstRate: 1200, type: "HSN" as const },
  { code: "9503", description: "Tricycles, scooters, pedal cars and similar wheeled toys; dolls", gstRate: 1200, type: "HSN" as const }
];

// Helper to seed table on-demand if empty
async function ensureSeeded() {
  try {
    const existing = await db.select({ id: hsnMaster.id }).from(hsnMaster).limit(1);
    if (existing.length === 0) {
      console.log("[HSN Master] Database table empty. Seeding 50 common HSN/SAC codes...");
      await db.insert(hsnMaster).values(COMMON_CODES);
      console.log("[HSN Master] Seeding completed successfully.");
    }
  } catch (error) {
    console.error("[HSN Master] Seeding failed, likely due to connection issue. Falling back to offline memory.", error);
    throw error;
  }
}

export async function searchHSN(query: string) {
  try {
    await ensureSeeded();
    const cleanQuery = `%${query}%`;
    const results = await db
      .select()
      .from(hsnMaster)
      .where(
        or(
          ilike(hsnMaster.code, cleanQuery),
          ilike(hsnMaster.description, cleanQuery)
        )
      )
      .limit(10);
    return results;
  } catch (error) {
    console.warn("[HSN Master] Search database query failed. Returning offline mock matches.", error);
    // Offline fallback matches
    const lowercaseQuery = query.toLowerCase();
    return COMMON_CODES.filter(
      item => item.code.includes(lowercaseQuery) || item.description.toLowerCase().includes(lowercaseQuery)
    ).slice(0, 10);
  }
}

export async function getHSNByCode(code: string) {
  try {
    await ensureSeeded();
    const results = await db
      .select()
      .from(hsnMaster)
      .where(eq(hsnMaster.code, code))
      .limit(1);
    if (results.length > 0) {
      return results[0];
    }
    return null;
  } catch (error) {
    console.warn("[HSN Master] Get by code query failed. Returning offline mock match.", error);
    const mock = COMMON_CODES.find(item => item.code === code);
    return mock || null;
  }
}
