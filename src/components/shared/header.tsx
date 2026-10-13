import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "./theme-toggle";
import { useStore } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/types";
import { LogOut, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { currentUser, logout } = useStore();

  if (!currentUser) return null;

  return (
    <header
      className="flex h-14 items-center justify-between border-b border-border bg-card px-6"
      role="banner"
    >
      <div className="flex flex-col">
        <h1 className="text-base font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                  {currentUser.avatar}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium">{currentUser.name}</span>
                <span className="text-[10px] text-muted-foreground">{ROLE_LABELS[currentUser.role]}</span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-1">
              <span>{currentUser.name}</span>
              <span className="text-xs font-normal text-muted-foreground">{currentUser.email}</span>
              <Badge variant="secondary" className="mt-1 w-fit text-[10px]">{ROLE_LABELS[currentUser.role]}</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
