import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";
import { resolve, basename, extname } from "path";
import { nameToSlug } from "./utils.js";

const IMAGES_DIR = resolve(
  new URL(".", import.meta.url).pathname,
  "../../../apps/mobile/assets/images/dofus"
);
const BUCKET = "dofus-images";

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const client = createClient(supabaseUrl, serviceRoleKey);

  // Ensure bucket exists and is public
  const { data: buckets } = await client.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === BUCKET);
  if (!bucketExists) {
    const { error } = await client.storage.createBucket(BUCKET, { public: true });
    if (error) {
      console.error(`Failed to create bucket: ${error.message}`);
      process.exit(1);
    }
    console.log(`Created bucket "${BUCKET}"`);
  }

  const files = readdirSync(IMAGES_DIR).filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f));
  console.log(`Found ${files.length} image(s) in ${IMAGES_DIR}\n`);

  const notFound: string[] = [];

  for (const file of files) {
    const slug = nameToSlug(basename(file, extname(file)));
    const filePath = resolve(IMAGES_DIR, file);
    const fileBuffer = readFileSync(filePath);
    const storagePath = `${slug}.png`;

    // Upload (upsert)
    const { error: uploadError } = await client.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error(`  ❌ Upload failed for "${file}": ${uploadError.message}`);
      continue;
    }

    const { data: urlData } = client.storage.from(BUCKET).getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    // Update dofus row
    const { data, error: updateError } = await client
      .from("dofus")
      .update({ image_url: publicUrl })
      .eq("slug", slug)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error(`  ❌ DB update failed for slug "${slug}": ${updateError.message}`);
    } else if (!data) {
      console.warn(`  ⚠️  No dofus row found for slug "${slug}" (file: ${file})`);
      notFound.push(file);
    } else {
      console.log(`  ✅ ${file} → slug "${slug}" → ${publicUrl}`);
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Processed: ${files.length - notFound.length} / ${files.length}`);
  if (notFound.length > 0) {
    console.log(`\nSlug not found in DB (${notFound.length}):`);
    notFound.forEach((f) => console.log(`  - ${f}  (slug: "${nameToSlug(basename(f, extname(f)))}")`));
    console.log("\nRename these files or check the dofus slugs in DB.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
