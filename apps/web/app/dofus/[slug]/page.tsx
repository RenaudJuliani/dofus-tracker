import { createClient } from "@/lib/supabase/server";
import { getDofusBySlug, getDofusList } from "@dofus-tracker/db";
import { DofusDetailClient } from "@/components/dofus/DofusDetailClient";
import { notFound, redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ highlight?: string }>;
}

export default async function DofusDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { highlight } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [dofus, allDofus] = await Promise.all([
    getDofusBySlug(supabase, slug),
    getDofusList(supabase),
  ]);

  if (!dofus) notFound();

  return (
    <DofusDetailClient
      dofus={dofus}
      allDofus={allDofus}
      userId={user.id}
      highlight={highlight ?? null}
    />
  );
}
