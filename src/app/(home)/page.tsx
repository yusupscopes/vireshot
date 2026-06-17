import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import Image from "next/image";
import { ProjectForm } from "@/modules/home/ui/components/project-form";
import { ProjectList } from "@/modules/home/ui/components/project-list";
import { getQueryClient, trpc } from "@/trpc/server";

const Page = async () => {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(
    trpc.projects.getMany.queryOptions(),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex flex-col max-w-5xl mx-auto w-full">
        <section className="space-y-6 py-[16vh] 2xl:py-48">
          <Image
            src="/vireshot-logo.svg"
            alt="Vireshot"
            width={50}
            height={50}
            className="hidden md:block mx-auto"
          />
          <h1 className="text-2xl md:text-5xl font-bold text-center">
            Build something great with Vireshot
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground text-center">
            Create websites by chatting with AI
          </p>
          <div className="max-w-3xl mx-auto w-full">
            <ProjectForm />
          </div>
        </section>
        <ProjectList />
      </div>
    </HydrationBoundary>
  );
};

export default Page;
