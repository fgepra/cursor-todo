"use client";

import * as React from "react";
import {
  CheckSquareIcon,
  SearchIcon,
  LogOutIcon,
  UserIcon,
  Loader2Icon,
  SparklesIcon,
  TrendingUpIcon,
  LightbulbIcon,
  TargetIcon,
  MoonIcon,
  SunIcon,
  MonitorIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { TodoForm, TodoList } from "@/components/todo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { Todo, TodoFormData, Priority } from "@/components/todo/types";

interface SummaryData {
  summary: string;
  urgentTasks: string[];
  insights: string[];
  recommendations: string[];
}

type FilterStatus = "all" | "completed" | "pending";
type SortOption = "priority" | "due_date" | "created_date" | "title";

export default function HomePage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [todos, setTodos] = React.useState<Todo[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<FilterStatus>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<Priority | "all">("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string | "all">("all");
  const [sortOption, setSortOption] = React.useState<SortOption>("created_date");
  const [editingTodo, setEditingTodo] = React.useState<Todo | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [deletingTodoId, setDeletingTodoId] = React.useState<string | null>(null);
  const [currentUser, setCurrentUser] = React.useState<{
    id: string;
    email: string;
    name: string;
  } | null>(null);
  const [todaySummary, setTodaySummary] = React.useState<SummaryData | null>(null);
  const [weekSummary, setWeekSummary] = React.useState<SummaryData | null>(null);
  const [isGeneratingToday, setIsGeneratingToday] = React.useState(false);
  const [isGeneratingWeek, setIsGeneratingWeek] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const itemsPerPage = 5;

  // 테마 마운트 처리 (hydration 오류 방지)
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // 할 일 목록 조회
  const fetchTodos = React.useCallback(async () => {
    if (!currentUser) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_date", { ascending: false });

      if (error) {
        toast.error("할 일 목록을 불러오는 중 오류가 발생했습니다.");
        return;
      }
      setTodos(data || []);
    } catch (error) {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // 인증 상태 감지
  React.useEffect(() => {
    const supabase = createClient();
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser({
          id: user.id,
          email: user.email || "",
          name: user.user_metadata?.name || user.email?.split("@")[0] || "사용자",
        });
      } else {
        router.push("/login");
      }
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setCurrentUser({
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "사용자",
        });
      } else if (event === "SIGNED_OUT") {
        setCurrentUser(null);
        setTodos([]);
        router.push("/login");
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  React.useEffect(() => {
    if (currentUser) {
      setIsLoading(true);
      fetchTodos();
    }
  }, [currentUser, fetchTodos]);

  // 필터링 및 정렬 로직
  const filteredAndSortedTodos = React.useMemo(() => {
    let filtered = [...todos];
    if (searchQuery) {
      filtered = filtered.filter((todo) =>
        todo.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (statusFilter === "completed") filtered = filtered.filter((todo) => todo.completed);
    else if (statusFilter === "pending") filtered = filtered.filter((todo) => !todo.completed);

    if (priorityFilter !== "all") filtered = filtered.filter((todo) => todo.priority === priorityFilter);

    if (categoryFilter !== "all") filtered = filtered.filter((todo) => todo.category === categoryFilter);

    filtered.sort((a, b) => {
      switch (sortOption) {
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case "due_date":
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case "created_date":
          return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
        case "title":
          return a.title.localeCompare(b.title, "ko");
        default:
          return 0;
      }
    });
    return filtered;
  }, [todos, searchQuery, statusFilter, priorityFilter, categoryFilter, sortOption]);

  // 페이지네이션 로직
  const totalPages = Math.ceil(filteredAndSortedTodos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTodos = filteredAndSortedTodos.slice(startIndex, endIndex);

  // 필터/정렬 변경 시 첫 페이지로 이동
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, priorityFilter, categoryFilter, sortOption]);

  // 프로필 통계 계산
  const profileStats = React.useMemo(() => {
    const totalTodos = todos.length;
    const completedTodos = todos.filter(t => t.completed).length;
    const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

    const priorityStats = {
      high: { total: 0, completed: 0 },
      medium: { total: 0, completed: 0 },
      low: { total: 0, completed: 0 },
    };

    todos.forEach(todo => {
      priorityStats[todo.priority].total++;
      if (todo.completed) {
        priorityStats[todo.priority].completed++;
      }
    });

    return {
      totalTodos,
      completedTodos,
      completionRate,
      priorityStats,
    };
  }, [todos]);

  // 핸들러 함수들
  const handleFormSubmit = async (data: TodoFormData) => {
    if (!currentUser) return;
    const supabase = createClient();
    
    if (editingTodo) {
      const { error } = await supabase.from("todos").update({
        title: data.title,
        description: data.description || null,
        due_date: data.due_date || null,
        priority: data.priority,
        category: data.category || null,
      }).eq("id", editingTodo.id).eq("user_id", currentUser.id);
      if (!error) toast.success("수정되었습니다.");
    } else {
      const { error } = await supabase.from("todos").insert({
        user_id: currentUser.id,
        title: data.title,
        description: data.description || null,
        due_date: data.due_date || null,
        priority: data.priority,
        category: data.category || null,
        completed: false,
      });
      if (!error) toast.success("추가되었습니다.");
    }
    fetchTodos();
    setIsFormOpen(false);
    setEditingTodo(undefined);
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    if (!currentUser) return;
    const supabase = createClient();
    await supabase.from("todos").update({ completed }).eq("id", id).eq("user_id", currentUser.id);
    fetchTodos();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTodoId || !currentUser) return;
    const supabase = createClient();
    await supabase.from("todos").delete().eq("id", deletingTodoId).eq("user_id", currentUser.id);
    fetchTodos();
    setDeletingTodoId(null);
  };

  // AI 요약 관련 로직
  const getTodayTodos = () => {
    const today = new Date().setHours(0, 0, 0, 0);
    return todos.filter(t => t.due_date && new Date(t.due_date).setHours(0, 0, 0, 0) === today);
  };

  const getWeekTodos = () => {
    const today = new Date();
    const start = new Date(today.setDate(today.getDate() - today.getDay())).setHours(0, 0, 0, 0);
    const end = new Date(today.setDate(today.getDate() + 7)).setHours(0, 0, 0, 0);
    return todos.filter(t => t.due_date && new Date(t.due_date).getTime() >= start && new Date(t.due_date).getTime() < end);
  };

  const handleGenerateSummary = async (period: 'today' | 'week') => {
    const targetTodos = period === 'today' ? getTodayTodos() : getWeekTodos();
    if (targetTodos.length === 0) return toast.error("분석할 할 일이 없습니다.");

    period === 'today' ? setIsGeneratingToday(true) : setIsGeneratingWeek(true);
    try {
      const response = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todos: targetTodos, period }),
      });
      const data = await response.json();
      period === 'today' ? setTodaySummary(data) : setWeekSummary(data);
      toast.success("분석이 완료되었습니다.");
    } catch (e) {
      toast.error("오류가 발생했습니다.");
    } finally {
      period === 'today' ? setIsGeneratingToday(false) : setIsGeneratingWeek(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  // 테마 토글 함수
  const handleThemeToggle = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("light");
    } else {
      // system 모드일 때는 dark로
      setTheme("dark");
    }
  };

  // 현재 테마에 따른 아이콘 반환
  const getThemeIcon = () => {
    if (!mounted) {
      return <MonitorIcon className="size-4" />;
    }
    if (theme === "light") {
      return <SunIcon className="size-4" />;
    } else if (theme === "dark") {
      return <MoonIcon className="size-4" />;
    }
    return <MonitorIcon className="size-4" />;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <CheckSquareIcon className="size-6 text-primary" />
            <h1 className="text-xl font-bold">할 일 관리</h1>
          </div>
          {currentUser && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleThemeToggle}
                className="relative"
                aria-label="테마 전환"
              >
                {getThemeIcon()}
              </Button>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
                      <Avatar className="size-8"><AvatarFallback><UserIcon className="size-4" /></AvatarFallback></Avatar>
                      <div className="hidden sm:flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsProfileOpen(true);
                          }}
                          className="text-primary hover:underline cursor-pointer font-medium"
                        >
                          {currentUser.name}
                        </button>
                        <span className="text-muted-foreground">({currentUser.email})</span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => {
                        setIsProfileOpen(true);
                      }}
                      className="text-primary focus:text-primary cursor-pointer"
                    >
                      <UserIcon className="mr-2 size-4 text-primary" /> {currentUser.name}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut} className="text-destructive focus:text-destructive">
                      <LogOutIcon className="mr-2 size-4 text-destructive" /> 로그아웃
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto flex-1 px-4 py-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* 좌측 폼 */}
          <aside className="w-full lg:w-96 lg:shrink-0">
            <TodoForm
              todo={editingTodo}
              onSubmit={handleFormSubmit}
              onCancel={editingTodo ? () => {setEditingTodo(undefined); setIsFormOpen(false);} : undefined}
            />
          </aside>

          {/* 우측 영역 */}
          <div className="flex-1 space-y-6">
            
            {/* 1. AI 요약 및 분석 (최상단으로 이동) */}
            <Card className="border-primary/20 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <SparklesIcon className="size-5 text-primary" />
                  AI 요약 및 분석
                </CardTitle>
                <CardDescription>할 일 목록을 분석하여 인사이트를 제공합니다</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="today" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="today">오늘의 요약</TabsTrigger>
                    <TabsTrigger value="week">이번 주 요약</TabsTrigger>
                  </TabsList>

                  {['today', 'week'].map((p) => (
                    <TabsContent key={p} value={p} className="space-y-4 mt-4">
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleGenerateSummary(p as 'today' | 'week')}
                          disabled={(p === 'today' ? isGeneratingToday : isGeneratingWeek)}
                          variant="outline"
                          className="gap-2"
                        >
                          {(p === 'today' ? isGeneratingToday : isGeneratingWeek) ? 
                            <Loader2Icon className="size-4 animate-spin" /> : <SparklesIcon className="size-4" />}
                          AI 분석 실행
                        </Button>
                      </div>

                      {(p === 'today' ? todaySummary : weekSummary) ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-4 md:col-span-2">
                            <div className="rounded-lg border bg-muted/30 p-4">
                              <h3 className="font-semibold flex items-center gap-2 mb-2"><TrendingUpIcon className="size-4 text-primary" /> 요약</h3>
                              <p className="text-sm text-muted-foreground">{(p === 'today' ? todaySummary : weekSummary)?.summary}</p>
                            </div>
                          </div>
                          <div className="rounded-lg border p-4">
                            <h3 className="font-semibold flex items-center gap-2 mb-2"><TargetIcon className="size-4 text-destructive" /> 긴급</h3>
                            <div className="flex flex-wrap gap-2">
                              {(p === 'today' ? todaySummary : weekSummary)?.urgentTasks.map((t, i) => <Badge key={i} variant="destructive">{t}</Badge>)}
                            </div>
                          </div>
                          <div className="rounded-lg border p-4">
                            <h3 className="font-semibold flex items-center gap-2 mb-2"><LightbulbIcon className="size-4 text-yellow-500" /> 추천</h3>
                            <ul className="text-sm space-y-1">
                              {(p === 'today' ? todaySummary : weekSummary)?.recommendations.map((r, i) => <li key={i} className="flex gap-2 text-muted-foreground"><span>•</span>{r}</li>)}
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-10 border rounded-lg border-dashed">
                          <SparklesIcon className="size-8 mx-auto mb-2 opacity-20" />
                          <p className="text-sm text-muted-foreground"> 버튼을 눌러 분석을 시작하세요</p>
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            {/* 2. 검색 및 필터 툴바 */}
            <div className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm sm:grid-cols-5">
              <div className="relative sm:col-span-1">
                <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="할 일 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
                <SelectTrigger><SelectValue placeholder="상태" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 상태</SelectItem>
                  <SelectItem value="pending">진행 중</SelectItem>
                  <SelectItem value="completed">완료됨</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as Priority | "all")}>
                <SelectTrigger><SelectValue placeholder="우선순위" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 우선순위</SelectItem>
                  <SelectItem value="high">높음</SelectItem>
                  <SelectItem value="medium">중간</SelectItem>
                  <SelectItem value="low">낮음</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                <SelectTrigger><SelectValue placeholder="정렬" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_date">최신순</SelectItem>
                  <SelectItem value="due_date">마감일순</SelectItem>
                  <SelectItem value="priority">우선순위순</SelectItem>
                  <SelectItem value="title">제목순</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
                <SelectTrigger><SelectValue placeholder="카테고리" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 카테고리</SelectItem>
                  <SelectItem value="업무">업무</SelectItem>
                  <SelectItem value="개인">개인</SelectItem>
                  <SelectItem value="학습">학습</SelectItem>
                  <SelectItem value="기타">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 3. 할 일 리스트 */}
            <div className="min-h-[400px]">
              {isLoading ? (
                <div className="flex h-40 items-center justify-center"><Loader2Icon className="size-8 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  <TodoList
                    todos={paginatedTodos}
                    onToggleComplete={handleToggleComplete}
                    onEdit={(t) => {setEditingTodo(t); setIsFormOpen(true);}}
                    onDelete={setDeletingTodoId}
                  />
                  {filteredAndSortedTodos.length >= 5 && totalPages > 1 && (
                    <Pagination className="mt-6">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1) setCurrentPage(currentPage - 1);
                            }}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(page);
                              }}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                            }}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 삭제 다이얼로그 */}
      <AlertDialog open={!!deletingTodoId} onOpenChange={() => setDeletingTodoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>할 일을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-white">삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 프로필 다이얼로그 */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserIcon className="size-5 text-primary" />
              사용자 프로필
            </DialogTitle>
            <DialogDescription>
              {currentUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* 완료율 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">완료율</span>
                <span className="text-2xl font-bold text-primary">{profileStats.completionRate}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${profileStats.completionRate}%` }}
                />
              </div>
            </div>

            {/* 할 일 리스트 개수 */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">전체 할 일</span>
                <span className="text-xl font-bold">{profileStats.totalTodos}개</span>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                완료: {profileStats.completedTodos}개 / 미완료: {profileStats.totalTodos - profileStats.completedTodos}개
              </div>
            </div>

            {/* 우선순위별 통계 */}
            <div className="space-y-3">
              <span className="text-sm font-medium">우선순위별 통계</span>
              <div className="space-y-2">
                {/* 높음 */}
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="destructive">높음</Badge>
                    <span className="text-sm font-medium">{profileStats.priorityStats.high.total}개</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    완료: {profileStats.priorityStats.high.completed}개
                  </div>
                </div>
                {/* 중간 */}
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="default">중간</Badge>
                    <span className="text-sm font-medium">{profileStats.priorityStats.medium.total}개</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    완료: {profileStats.priorityStats.medium.completed}개
                  </div>
                </div>
                {/* 낮음 */}
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">낮음</Badge>
                    <span className="text-sm font-medium">{profileStats.priorityStats.low.total}개</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    완료: {profileStats.priorityStats.low.completed}개
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}