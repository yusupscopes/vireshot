import { ProjectView } from "@/modules/projects/ui/views/project-view";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";

interface Props {
  params: Promise<{
    projectId: string;
  }>;
}

const Page = async ({ params }: Props) => {
  const { projectId } = await params;
  const queryClient = getQueryClient();
  // Prefetch every query the view reads with useSuspenseQuery. A query
  // missing here runs during SSR through the HTTP link, which has no
  // request cookies, so protected procedures fail with UNAUTHORIZED.
  await Promise.all([
    queryClient.prefetchQuery(
      trpc.messages.getMany.queryOptions({ projectId }),
    ),
    queryClient.prefetchQuery(
      trpc.projects.getOne.queryOptions({ id: projectId }),
    ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<div>Loading Project...</div>}>
        <ProjectView projectId={projectId} />
      </Suspense>
    </HydrationBoundary>
  );
};

export default Page;
