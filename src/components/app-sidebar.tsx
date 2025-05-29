import * as React from "react";
import {
  BookOpen,
  Calendar,
  CloudUpload,
  Command,
  GitBranchPlus,
  Landmark,
  MailWarning,
  Settings2,
  SquareTerminal,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Отклики",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Все отклики",
          url: "#",
        },
        {
          // TODO: логично что у админов и учеников разные ссылки))
          title: "Ждут моего ответа",
          url: "#",
        },
        {
          title: "Слитые",
          url: "#",
        },
      ],
    },
    {
      title: "Мои задания",
      url: "#",
      icon: GitBranchPlus,
      items: [
        {
          title: "Учебный проект",
          url: "#",
        },
        {
          title: "Задания",
          url: "#",
        },
      ],
    },
    {
      title: "Мои материалы",
      url: "#",
      icon: Landmark,
      items: [
        {
          title: "Все",
          url: "#",
          icon: BookOpen,
        },
        {
          title: "Новые",
          url: "#",
          icon: MailWarning,
        },
      ],
    },
    {
      // TODO: admin rights
      title: "Менеджмент учеников",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Договоры и ученики",
          url: "#",
        },
        {
          title: "Проверка заданий",
          url: "#",
        },
        {
          title: "Проверка откликов",
          url: "#",
        },
        {
          title: "Журнал",
          url: "#",
        },
      ],
    },
    {
      // TODO: admin rights
      title: "Менеджмент контента",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Добавить материал",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [],
  projects: [
    {
      name: "Созвоны",
      url: "#",
      icon: Calendar,
    },
    {
      // TODO: studentj rights
      name: "Загрузить запись",
      url: "#",
      icon: CloudUpload,
    },
    {
      // TODO: admin rights
      name: "Загрузить фидбек",
      url: "#",
      icon: CloudUpload,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Acme Inc</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
